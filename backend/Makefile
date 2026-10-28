CC ?= gcc
CFLAGS ?= -O3 -Wall -Wextra -std=c11 -pedantic -D_POSIX_C_SOURCE=200809L
BIN_DIR = ../bin
TARGET = $(BIN_DIR)/dedup_core

SRCS = sha256.c dedup_core.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS) | $(BIN_DIR)
	$(CC) $(CFLAGS) -o $@ $(OBJS)

%.o: %.c sha256.h
	$(CC) $(CFLAGS) -c $< -o $@

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

clean:
	rm -f $(OBJS) $(TARGET)

test: $(TARGET)
	$(TARGET) version
	$(TARGET) benchmark 500 2

.PHONY: all clean test
