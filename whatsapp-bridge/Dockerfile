# syntax=docker.io/docker/dockerfile:1

FROM golang:1.26-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o whatsapp .

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /build/whatsapp .

ENV PORT=8080
ENV DEV=false
EXPOSE 8080

CMD ["./whatsapp"]
