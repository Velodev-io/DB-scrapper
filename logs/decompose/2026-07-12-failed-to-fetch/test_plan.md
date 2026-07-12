# Test Plan: Failed to Fetch Investigation

## 1. Vercel API endpoint `/api/v1/properties` is reachable and healthy
- **Test Command**:
  ```bash
  curl -I https://carry-api-pink.vercel.app/api/v1/properties
  ```
- **PASS**: Returns HTTP status code `401 Unauthorized` (confirming the endpoint exists and auth is active).
- **FAIL**: Returns `404 Not Found`, `500 Internal Server Error`, or connection timeout.

## 2. CORS headers in Vercel API allow requests from `https://carry-admin-suryansh.web.app`
- **Test Command**:
  ```bash
  curl -H "Origin: https://carry-admin-suryansh.web.app" \
       -H "Access-Control-Request-Method: GET" \
       -H "Access-Control-Request-Headers: authorization" \
       -X OPTIONS -I https://carry-api-pink.vercel.app/api/v1/properties
  ```
- **PASS**: Response headers include `Access-Control-Allow-Origin: https://carry-admin-suryansh.web.app` and `Access-Control-Allow-Credentials: true`.
- **FAIL**: Headers are missing or don't match the origin.

## 3. Carry Admin points to the correct `VITE_API_BASE` URL
- **Test Action**: Read `apps/admin/.env` and verify the value of `VITE_API_BASE`.
- **PASS**: Contains `https://carry-api-pink.vercel.app/api/v1` exactly.
- **FAIL**: Points to localhost or another domain.
