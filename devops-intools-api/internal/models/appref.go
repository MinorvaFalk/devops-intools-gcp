package models

import (
	"encoding/json"
	"time"
)

// RefProject represents an entry from the Core projects API.
// Source: https://core.pru.intranet.asia/rest/projects/
type RefProject struct {
	Code              string `json:"code"`
	Name              string `json:"name"`
	Description       string `json:"description,omitempty"`
	BusinessFunction  string `json:"business_function,omitempty"`
	Criticality       string `json:"criticality,omitempty"`
	Hosting           string `json:"hosting,omitempty"`
	Owner             string `json:"owner,omitempty"`
	ManagersGroup     string `json:"managers_group,omitempty"`
	ContributorsGroup string `json:"contributors_group,omitempty"`
	ViewersGroup      string `json:"viewers_group,omitempty"`
}

// AppRef is an application reference entry in the dictionary.
type AppRef struct {
	Code               string    `json:"code"`
	Name               string    `json:"name"`
	Description        *string   `json:"description,omitempty"`
	Stage              string    `json:"stage"`
	ProjectCode        *string   `json:"project_code"`
	Size               *string   `json:"size,omitempty"`
	AdditionalFeatures *string   `json:"additional_features,omitempty"`
	Owner              *string   `json:"owner,omitempty"`
	PIC                *string   `json:"pic,omitempty"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type CreateAppRefRequest struct {
	Code               string  `json:"code"                validate:"required,max=50"`
	Name               string  `json:"name"               validate:"required,max=255"`
	Description        *string `json:"description"`
	Stage              string  `json:"stage"              validate:"required,oneof=prod stg dev uat"`
	ProjectCode        *string `json:"project_code"       validate:"omitempty,max=20"`
	Size               string  `json:"size"               validate:"omitempty,oneof=small medium large"`
	AdditionalFeatures *string `json:"additional_features"`
	Owner              string  `json:"owner"              validate:"omitempty,max=255"`
	PIC                string  `json:"pic"                validate:"omitempty,email"`
}

type UpdateAppRefRequest struct {
	Name               *string `json:"name"         validate:"required,max=255"`
	Description        *string `json:"description"`
	Stage              *string `json:"stage"        validate:"required,oneof=prod stg dev uat"`
	ProjectCode        *string `json:"project_code" validate:"omitempty,max=20"`
	Size               *string `json:"size"         validate:"omitempty,oneof=small medium large"`
	AdditionalFeatures *string `json:"additional_features"`
	Owner              *string `json:"owner"        validate:"omitempty,max=255"`
	PIC                *string `json:"pic"          validate:"omitempty,email"`
}

// AppRefFilter holds optional query filters for listing apprefs.
type AppRefFilter struct {
	Status      string `query:"status"`
	Stage       string `query:"stage"`
	ProjectCode string `query:"project_code"`
}

// AuditLog records a single create/update/decommission action on an appref.
// ActorIP is always populated; ActorID and ActorEmail are reserved for AzureAD.
// Changes holds a field-level before/after map: {"field": {"from": ..., "to": ...}}.
type AuditLog struct {
	ID           int64           `json:"id"`
	ResourceCode string          `json:"resource_code"`
	Action       string          `json:"action"` // CREATE | UPDATE | DECOMMISSION
	ActorIP      string          `json:"actor_ip,omitempty"`
	ActorID      string          `json:"actor_id,omitempty"`
	ActorEmail   string          `json:"actor_email,omitempty"`
	Changes      json.RawMessage `json:"changes,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}
