package api

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5/middleware"

	"github.com/polygonid/sh-id-platform/internal/core/apikey"
	"github.com/polygonid/sh-id-platform/internal/core/ports"
	apiErrors "github.com/polygonid/sh-id-platform/internal/errors"
	"github.com/polygonid/sh-id-platform/internal/log"
)

type apiKeyAuthenticatedContextKey struct{}

// LogMiddleware returns a middleware that adds general log configuration to each context request
func LogMiddleware(ctx context.Context) StrictMiddlewareFunc {
	return func(f StrictHandlerFunc, operationID string) StrictHandlerFunc {
		return func(ctxReq context.Context, w http.ResponseWriter, r *http.Request, args interface{}) (interface{}, error) {
			if reqID := middleware.GetReqID(ctxReq); reqID != "" {
				log.With("req-id", reqID)
			}
			return f(ctx, w, r, args)
		}
	}
}

// BasicAuthMiddleware returns a middleware that performs an http basic authorization for endpoints configured with
// basic auth in the api spec.
// In uses the BasicAuthScopes value in context to figure if and endpoint needs authorization or not, because this
// value is injected automatically by openapi when basic auth is selected
func BasicAuthMiddleware(ctx context.Context, user, pass string) StrictMiddlewareFunc {
	return func(f StrictHandlerFunc, operationID string) StrictHandlerFunc {
		return func(ctxReq context.Context, w http.ResponseWriter, r *http.Request, args interface{}) (interface{}, error) {
			if ctxReq.Value(BasicAuthScopes) != nil && user != "" && pass != "" {
				if authenticated, ok := ctxReq.Value(apiKeyAuthenticatedContextKey{}).(bool); ok && authenticated {
					return f(ctxReq, w, r, args)
				}
				userReq, passReq, ok := r.BasicAuth()
				if !ok {
					return nil, apiErrors.AuthError{Err: errors.New("unauthorized")}
				}
				if subtle.ConstantTimeCompare([]byte(user), []byte(userReq)) != 1 || subtle.ConstantTimeCompare([]byte(pass), []byte(passReq)) != 1 {
					return nil, apiErrors.AuthError{Err: errors.New("unauthorized")}
				}
			}
			return f(ctx, w, r, args)
		}
	}
}

// APIKeyAuthMiddleware authenticates partner-facing operations configured in requiredScopesByOperation.
func APIKeyAuthMiddleware(apiKeyService ports.APIKeyService, requiredScopesByOperation map[string][]string) StrictMiddlewareFunc {
	return func(f StrictHandlerFunc, operationID string) StrictHandlerFunc {
		return func(ctxReq context.Context, w http.ResponseWriter, r *http.Request, args interface{}) (interface{}, error) {
			requiredScopes, ok := requiredScopesByOperation[operationID]
			if !ok {
				return f(ctxReq, w, r, args)
			}
			if apiKeyService == nil {
				return nil, apiErrors.AuthError{Err: errors.New("api key authentication is not configured")}
			}
			secret := apiKeyFromRequest(r)
			if secret == "" {
				return nil, apiErrors.AuthError{Err: errors.New("unauthorized")}
			}
			_, err := apiKeyService.Authenticate(ctxReq, secret, requiredScopes...)
			if err != nil {
				if errors.Is(err, apikey.ErrMissingScope) {
					return nil, apiErrors.AuthError{Err: errors.New("forbidden")}
				}
				return nil, apiErrors.AuthError{Err: errors.New("unauthorized")}
			}
			authenticatedCtx := context.WithValue(ctxReq, apiKeyAuthenticatedContextKey{}, true)
			return f(authenticatedCtx, w, r, args)
		}
	}
}

func apiKeyFromRequest(r *http.Request) string {
	if value := strings.TrimSpace(r.Header.Get("X-API-Key")); value != "" {
		return value
	}
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return strings.TrimSpace(auth[len("bearer "):])
	}
	return ""
}
