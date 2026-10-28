/**
 * @file sha256.h
 * @brief High-performance FIPS 180-4 SHA-256 cryptographic hash implementation in C.
 * 
 * Part of DedupCore C Backend Engine for Duplicate File Detection.
 */

#ifndef SHA256_H
#define SHA256_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SHA256_BLOCK_SIZE 64
#define SHA256_DIGEST_SIZE 32
#define SHA256_HEX_STRING_LEN 65

typedef struct {
    uint32_t state[8];
    uint64_t bit_count;
    uint8_t buffer[SHA256_BLOCK_SIZE];
} SHA256_CTX;

/**
 * Initializes the SHA-256 context with standard FIPS 180-4 initial hash values (H0..H7).
 */
void sha256_init(SHA256_CTX *ctx);

/**
 * Continuously feeds data chunks into the SHA-256 state machine.
 */
void sha256_update(SHA256_CTX *ctx, const uint8_t *data, size_t len);

/**
 * Applies standard bit padding (0x80 followed by zeros and 64-bit length)
 * and finalizes the 32-byte (256-bit) digest.
 */
void sha256_final(SHA256_CTX *ctx, uint8_t digest[SHA256_DIGEST_SIZE]);

/**
 * Convenience helper to compute SHA-256 on a memory buffer.
 */
void sha256_buffer(const uint8_t *data, size_t len, uint8_t digest[SHA256_DIGEST_SIZE]);

/**
 * Convenience helper to compute SHA-256 directly on an open file handle using buffered streaming.
 * Returns 0 on success, -1 on read error.
 */
int sha256_file(const char *filepath, uint8_t digest[SHA256_DIGEST_SIZE], uint64_t *out_bytes_read);

/**
 * Computes partial hash by sampling first 4KB (head) and last 4KB (tail) of a file.
 * Returns 0 on success, -1 on error.
 */
int sha256_file_partial(const char *filepath, uint8_t digest[SHA256_DIGEST_SIZE], uint64_t *out_bytes_read);

/**
 * Converts a 32-byte binary digest into a null-terminated 64-character lowercase hex string.
 */
void sha256_to_hex(const uint8_t digest[SHA256_DIGEST_SIZE], char hex_str[SHA256_HEX_STRING_LEN]);

#ifdef __cplusplus
}
#endif

#endif /* SHA256_H */
