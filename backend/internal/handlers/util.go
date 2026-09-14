package handlers

import (
	"strconv"
	"time"
)

func timeNow() string { return time.Now().Format("2006-01-02 15:04:05") }

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
