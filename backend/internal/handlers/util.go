package handlers

import (
	"strconv"
	"time"
)

func timeNow() string {
	return time.Now().In(time.FixedZone("Asia/Ulaanbaatar", 8*60*60)).Format("02-01-2006 15:04:05")
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
