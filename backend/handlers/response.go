package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const MaxTextLen = 1 << 20 // 1MB

type APIResponse struct {
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
}

func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{OK: true, Data: data})
}

func Fail(c *gin.Context, status int, msg string) {
	c.JSON(status, APIResponse{OK: false, Error: msg})
}

func checkTextLen(text string) string {
	if len(text) == 0 {
		return "text 不能为空"
	}
	if len(text) > MaxTextLen {
		return "文本超过 1MB 上限"
	}
	return ""
}
