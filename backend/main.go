package main

import (
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"tools-server/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	addr := envOr("ADDR", "127.0.0.1:8080")
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())
	r.Use(corsMiddleware())
	r.Use(bodySizeLimit(handlers.MaxTextLen + 64*1024))
	r.Use(rateLimitMiddleware(60, time.Minute))

	r.GET("/api/health", func(c *gin.Context) {
		handlers.OK(c, gin.H{"status": "ok"})
	})
	r.GET("/api/time", handlers.Time)
	r.POST("/api/base64", handlers.Base64)
	r.POST("/api/url", handlers.URL)
	r.POST("/api/hash", handlers.Hash)
	r.POST("/api/uuid", handlers.UUID)
	r.POST("/api/password", handlers.Password)
	r.POST("/api/qrcode", handlers.QRCode)

	log.Printf("tools-server listening on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func bodySizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

type visitor struct {
	count int
	reset time.Time
}

func rateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	visitors := make(map[string]*visitor)

	go func() {
		for {
			time.Sleep(window)
			mu.Lock()
			now := time.Now()
			for ip, v := range visitors {
				if now.After(v.reset) {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		mu.Lock()
		v, ok := visitors[ip]
		if !ok || now.After(v.reset) {
			visitors[ip] = &visitor{count: 1, reset: now.Add(window)}
			mu.Unlock()
			c.Next()
			return
		}
		if v.count >= limit {
			mu.Unlock()
			handlers.Fail(c, http.StatusTooManyRequests, "请求过于频繁，请稍后再试")
			c.Abort()
			return
		}
		v.count++
		mu.Unlock()
		c.Next()
	}
}
