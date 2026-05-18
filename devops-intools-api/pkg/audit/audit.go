// Package audit provides request-scoped actor identity that flows through
// context. Currently populated from the client IP; structured to accept
// AzureAD claims (UserID, Email, Name) once auth is wired up.
package audit

import "context"

type ctxKey struct{}

// Actor holds identity information about who triggered an action.
// IP is always populated. UserID and Email are empty until AzureAD is wired up.
type Actor struct {
	IP     string
	UserID string // AzureAD object ID
	Email  string // AzureAD email
}

func WithActor(ctx context.Context, a Actor) context.Context {
	return context.WithValue(ctx, ctxKey{}, a)
}

func ActorFromContext(ctx context.Context) Actor {
	a, _ := ctx.Value(ctxKey{}).(Actor)
	return a
}
