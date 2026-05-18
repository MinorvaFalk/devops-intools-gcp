package repository

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("already exists")
	ErrFKViolation = errors.New("referenced resource does not exist")
)

// classifyPgErr wraps common Postgres error codes into sentinel errors.
func classifyPgErr(op string, err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return ErrConflict
		case "23503": // foreign_key_violation
			return ErrFKViolation
		}
	}
	return fmt.Errorf("%s: %w", op, err)
}
