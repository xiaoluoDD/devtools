package handlers

import (
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"hash"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type hashReq struct {
	Text string `json:"text"`
	Algo string `json:"algo"` // md5 | sha1 | sha256
}

func Hash(c *gin.Context) {
	var req hashReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, "无效的 JSON 请求体")
		return
	}
	if msg := checkTextLen(req.Text); msg != "" {
		Fail(c, http.StatusBadRequest, msg)
		return
	}

	var h hash.Hash
	switch strings.ToLower(req.Algo) {
	case "md5":
		h = md5.New()
	case "sha1":
		h = sha1.New()
	case "sha256":
		h = sha256.New()
	default:
		Fail(c, http.StatusBadRequest, "algo 须为 md5、sha1 或 sha256")
		return
	}

	h.Write([]byte(req.Text))
	OK(c, hex.EncodeToString(h.Sum(nil)))
}
