package gcperr

import (
	"errors"
	"strings"

	"google.golang.org/api/googleapi"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ClassifiedError is a GCP API error mapped to an HTTP status and a clean message.
type ClassifiedError struct {
	HTTPStatus int
	Message    string
}

// Classify maps any GCP API error to an HTTP status and a clean message.
// Returns nil when err is not a recognisable GCP error (caller should 500).
// Handles both REST-backed clients (googleapi.Error) and gRPC-backed clients,
// including errors wrapped with fmt.Errorf("%w", ...).
func Classify(err error) *ClassifiedError {
	// ── REST (Compute, SQL Admin, GCS, Resource Manager) ──────────────────────
	var gErr *googleapi.Error
	if errors.As(err, &gErr) {
		msg := gErr.Message
		if isAPIDisabled(msg, gErr.Errors) {
			return &ClassifiedError{403, trimEnableURL(msg)}
		}
		return &ClassifiedError{gErr.Code, msg}
	}

	// ── gRPC (GKE, Redis, Monitoring) ─────────────────────────────────────────
	// status.FromError does not unwrap, so we walk the chain manually.
	if st, ok := grpcStatus(err); ok {
		msg := cleanGRPCMessage(st.Message())
		if st.Code() == codes.PermissionDenied && isDisabledMsg(msg) {
			return &ClassifiedError{403, trimEnableURL(msg)}
		}
		return &ClassifiedError{grpcToHTTP(st.Code()), msg}
	}

	return nil
}

// grpcStatus walks the error chain looking for a gRPC status error.
func grpcStatus(err error) (*status.Status, bool) {
	for err != nil {
		if st, ok := status.FromError(err); ok {
			return st, true
		}
		err = errors.Unwrap(err)
	}
	return nil, false
}

// grpcToHTTP maps gRPC status codes to HTTP status codes.
func grpcToHTTP(c codes.Code) int {
	switch c {
	case codes.NotFound:
		return 404
	case codes.AlreadyExists:
		return 409
	case codes.PermissionDenied:
		return 403
	case codes.Unauthenticated:
		return 401
	case codes.InvalidArgument, codes.FailedPrecondition, codes.OutOfRange:
		return 400
	case codes.ResourceExhausted:
		return 429
	case codes.Unavailable:
		return 503
	case codes.DeadlineExceeded:
		return 504
	case codes.Unimplemented:
		return 501
	default:
		return 500
	}
}

// cleanGRPCMessage strips the noisy "error details: name = RequestInfo ..."
// trailer that GCP appends to some gRPC error messages.
func cleanGRPCMessage(msg string) string {
	if i := strings.Index(msg, "\nerror details:"); i > 0 {
		return strings.TrimSpace(msg[:i])
	}
	return msg
}

func isAPIDisabled(msg string, errs []googleapi.ErrorItem) bool {
	for _, e := range errs {
		if strings.EqualFold(e.Reason, "accessNotConfigured") {
			return true
		}
	}
	return isDisabledMsg(msg)
}

func isDisabledMsg(msg string) bool {
	return strings.Contains(msg, "has not been used") ||
		strings.Contains(msg, "not enabled") ||
		strings.Contains(msg, "API not enabled") ||
		strings.Contains(msg, "accessNotConfigured")
}

func trimEnableURL(msg string) string {
	if i := strings.Index(msg, " Enable it by visiting"); i > 0 {
		return msg[:i] + ". Enable it in the Google Cloud Console."
	}
	return msg
}
