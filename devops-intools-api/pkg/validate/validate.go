package validate

import (
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"

	"github.com/go-playground/validator/v10"
)

var v *validator.Validate

func init() {
	v = validator.New()
	// Use json tag names in error messages so field names match API payloads.
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" || name == "" {
			return fld.Name
		}
		return name
	})
}

// Error holds field-level validation failures returned by Check.
type Error struct {
	Fields map[string]string
}

func (e *Error) Error() string {
	msgs := make([]string, 0, len(e.Fields))
	for f, m := range e.Fields {
		msgs = append(msgs, f+": "+m)
	}
	sort.Strings(msgs)
	return "validation failed: " + strings.Join(msgs, "; ")
}

// Check validates a struct and returns *Error if any constraints fail, nil otherwise.
func Check(val any) error {
	if err := v.Struct(val); err != nil {
		var ve validator.ValidationErrors
		if errors.As(err, &ve) {
			fields := make(map[string]string, len(ve))
			for _, fe := range ve {
				fields[fe.Field()] = fieldMessage(fe)
			}
			return &Error{Fields: fields}
		}
		return err
	}
	return nil
}

func fieldMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "is required"
	case "max":
		return fmt.Sprintf("must be at most %s characters", fe.Param())
	case "min":
		return fmt.Sprintf("must be at least %s characters", fe.Param())
	case "oneof":
		return fmt.Sprintf("must be one of: %s", strings.ReplaceAll(fe.Param(), " ", ", "))
	case "email":
		return "must be a valid email address"
	default:
		return fmt.Sprintf("failed %s validation", fe.Tag())
	}
}
