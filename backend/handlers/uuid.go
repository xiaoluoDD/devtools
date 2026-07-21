package handlers

import (
	"crypto/rand"
	"math/big"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type uuidReq struct {
	Count int `json:"count"`
}

type passwordReq struct {
	Length  int  `json:"length"`
	Symbols bool `json:"symbols"`
	Count   int  `json:"count"`
}

func UUID(c *gin.Context) {
	var req uuidReq
	_ = c.ShouldBindJSON(&req)
	if req.Count <= 0 {
		req.Count = 1
	}
	if req.Count > 100 {
		Fail(c, http.StatusBadRequest, "一次最多生成 100 个 UUID")
		return
	}

	list := make([]string, 0, req.Count)
	for i := 0; i < req.Count; i++ {
		list = append(list, uuid.NewString())
	}
	if req.Count == 1 {
		OK(c, list[0])
		return
	}
	OK(c, list)
}

func Password(c *gin.Context) {
	var req passwordReq
	_ = c.ShouldBindJSON(&req)
	if req.Length <= 0 {
		req.Length = 16
	}
	if req.Length > 128 {
		Fail(c, http.StatusBadRequest, "密码长度最多 128")
		return
	}
	if req.Count <= 0 {
		req.Count = 1
	}
	if req.Count > 50 {
		Fail(c, http.StatusBadRequest, "一次最多生成 50 个密码")
		return
	}

	charset := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	if req.Symbols {
		charset += "!@#$%^&*()-_=+[]{}?,."
	}

	list := make([]string, 0, req.Count)
	for i := 0; i < req.Count; i++ {
		pw, err := randomString(charset, req.Length)
		if err != nil {
			Fail(c, http.StatusInternalServerError, "生成密码失败")
			return
		}
		list = append(list, pw)
	}
	if req.Count == 1 {
		OK(c, list[0])
		return
	}
	OK(c, list)
}

func randomString(charset string, n int) (string, error) {
	var b strings.Builder
	b.Grow(n)
	max := big.NewInt(int64(len(charset)))
	for i := 0; i < n; i++ {
		idx, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b.WriteByte(charset[idx.Int64()])
	}
	return b.String(), nil
}
