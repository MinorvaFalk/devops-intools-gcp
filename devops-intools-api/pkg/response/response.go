package response

import (
	"github.com/gofiber/fiber/v3"
)

// Envelope is the standard API response wrapper.
type Envelope struct {
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
}

// PaginatedEnvelope wraps list responses with pagination metadata.
type PaginatedEnvelope struct {
	Data       any    `json:"data"`
	TotalCount int    `json:"total_count"`
	PageToken  string `json:"next_page_token,omitempty"`
}

func JSON(c fiber.Ctx, status int, payload any) error {
	return c.Status(status).JSON(payload)
}

func OK(c fiber.Ctx, data any) error {
	return JSON(c, fiber.StatusOK, Envelope{Data: data})
}

func Created(c fiber.Ctx, data any) error {
	return JSON(c, fiber.StatusCreated, Envelope{Data: data})
}

func Accepted(c fiber.Ctx, message string) error {
	return JSON(c, fiber.StatusAccepted, Envelope{Message: message})
}

func NoContent(c fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

func BadRequest(c fiber.Ctx, err error) error {
	return JSON(c, fiber.StatusBadRequest, Envelope{Error: err.Error()})
}

// ValidationEnvelope returns field-level validation errors alongside a summary.
type ValidationEnvelope struct {
	Error  string            `json:"error"`
	Fields map[string]string `json:"fields"`
}

func ValidationErrors(c fiber.Ctx, fields map[string]string) error {
	return JSON(c, fiber.StatusBadRequest, ValidationEnvelope{
		Error:  "validation failed",
		Fields: fields,
	})
}

func NotFound(c fiber.Ctx, resource string) error {
	return JSON(c, fiber.StatusNotFound, Envelope{Error: resource + " not found"})
}

func Conflict(c fiber.Ctx, msg string) error {
	return JSON(c, fiber.StatusConflict, Envelope{Error: msg})
}

func Unauthorized(c fiber.Ctx, msg string) error {
	return JSON(c, fiber.StatusUnauthorized, Envelope{Error: msg})
}

func Forbidden(c fiber.Ctx, msg string) error {
	return JSON(c, fiber.StatusForbidden, Envelope{Error: msg})
}

func InternalError(c fiber.Ctx, err error) error {
	return JSON(c, fiber.StatusInternalServerError, Envelope{Error: "internal server error: " + err.Error()})
}

func Paginated(c fiber.Ctx, data any, total int, nextToken string) error {
	return JSON(c, fiber.StatusOK, PaginatedEnvelope{
		Data:       data,
		TotalCount: total,
		PageToken:  nextToken,
	})
}
