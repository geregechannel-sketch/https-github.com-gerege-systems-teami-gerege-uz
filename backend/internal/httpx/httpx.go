// Package httpx provides the ec3api response envelope and helpers.
package httpx

import (
	"encoding/json"
	"net/http"
)

// Envelope mirrors ec3api: {"success":true,"data":...} or
// {"success":false,"code":<int>,"message":"..."}; grid adds totalCount.
type Envelope struct {
	Success    bool        `json:"success"`
	Data       interface{} `json:"data,omitempty"`
	TotalCount *int64      `json:"totalCount,omitempty"`
	Code       int         `json:"code,omitempty"`
	Message    string      `json:"message,omitempty"`
}

// OK writes a success envelope with data.
func OK(w http.ResponseWriter, data interface{}) {
	write(w, http.StatusOK, Envelope{Success: true, Data: data})
}

// OKList writes a success envelope with data + totalCount (grid responses).
func OKList(w http.ResponseWriter, data interface{}, total int64) {
	write(w, http.StatusOK, Envelope{Success: true, Data: data, TotalCount: &total})
}

// Fail writes an error envelope with the given HTTP status as the code.
func Fail(w http.ResponseWriter, status int, msg string) {
	write(w, status, Envelope{Success: false, Code: status, Message: msg})
}

func write(w http.ResponseWriter, status int, e Envelope) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(e)
}
