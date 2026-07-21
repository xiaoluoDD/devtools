package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
)

func Time(c *gin.Context) {
	now := time.Now()
	OK(c, gin.H{
		"unix":        now.Unix(),
		"unix_ms":     now.UnixMilli(),
		"iso":         now.Format(time.RFC3339),
		"local":       now.Format("2006-01-02 15:04:05"),
		"timezone":    now.Location().String(),
		"utc":         now.UTC().Format("2006-01-02 15:04:05"),
	})
}
