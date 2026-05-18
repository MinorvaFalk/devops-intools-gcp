// Package migrations embeds the SQL migration files so that the migrate
// command can be built as a self-contained binary without external file deps.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
