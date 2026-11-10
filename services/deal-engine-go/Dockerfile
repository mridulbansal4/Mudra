# syntax=docker/dockerfile:1
# Build from the repo root or this directory:
#   docker build -t samadhan/deal-engine-go services/deal-engine-go
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/deal-engine ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/deal-engine /deal-engine
ENV GO_DEAL_ENGINE_PORT=4002
EXPOSE 4002
USER nonroot:nonroot
ENTRYPOINT ["/deal-engine"]
