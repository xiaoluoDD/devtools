package handlers

import (
	"encoding/base64"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

type encodeReq struct {
	Text   string `json:"text"`
	Action string `json:"action"` // encode | decode
}

func Base64(c *gin.Context) {
	var req encodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, "无效的 JSON 请求体")
		return
	}
	if msg := checkTextLen(req.Text); msg != "" {
		Fail(c, http.StatusBadRequest, msg)
		return
	}

	switch req.Action {
	case "encode":
		OK(c, base64.StdEncoding.EncodeToString([]byte(req.Text)))
	case "decode":
		raw, err := base64.StdEncoding.DecodeString(req.Text)
		if err != nil {
			Fail(c, http.StatusBadRequest, "Base64 解码失败: "+err.Error())
			return
		}
		OK(c, string(raw))
	default:
		Fail(c, http.StatusBadRequest, "action 须为 encode 或 decode")
	}
}

func URL(c *gin.Context) {
	var req encodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, "无效的 JSON 请求体")
		return
	}
	if msg := checkTextLen(req.Text); msg != "" {
		Fail(c, http.StatusBadRequest, msg)
		return
	}

	switch req.Action {
	case "encode":
		OK(c, url.QueryEscape(req.Text))
	case "decode":
		raw, err := url.QueryUnescape(req.Text)
		if err != nil {
			Fail(c, http.StatusBadRequest, "URL 解码失败: "+err.Error())
			return
		}
		OK(c, raw)
	default:
		Fail(c, http.StatusBadRequest, "action 须为 encode 或 decode")
	}
}
