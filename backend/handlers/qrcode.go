package handlers

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	qrcode "github.com/skip2/go-qrcode"
)

type qrcodeReq struct {
	Text string `json:"text"`
	Size int    `json:"size"` // px, default 256
}

func QRCode(c *gin.Context) {
	var req qrcodeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, "无效的 JSON 请求体")
		return
	}
	if msg := checkTextLen(req.Text); msg != "" {
		Fail(c, http.StatusBadRequest, msg)
		return
	}
	if len(req.Text) > 2000 {
		Fail(c, http.StatusBadRequest, "二维码文本最长 2000 字符")
		return
	}
	if req.Size <= 0 {
		req.Size = 256
	}
	if req.Size > 1024 {
		req.Size = 1024
	}

	png, err := qrcode.Encode(req.Text, qrcode.Medium, req.Size)
	if err != nil {
		Fail(c, http.StatusInternalServerError, "生成二维码失败: "+err.Error())
		return
	}

	OK(c, gin.H{
		"mime":    "image/png",
		"base64":  base64.StdEncoding.EncodeToString(png),
		"data_url": "data:image/png;base64," + base64.StdEncoding.EncodeToString(png),
	})
}
