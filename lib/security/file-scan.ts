import net from "node:net";

const DEFAULT_PORT = 3310;
const CHUNK_SIZE = 64 * 1024;
const SCAN_TIMEOUT_MS = 15_000;

export type FileScanResult =
  | { status: "clean" }
  | { status: "infected"; reason: string }
  | { status: "unavailable"; reason: string };

function clamavHost() {
  return process.env.CLAMAV_HOST?.trim() || "";
}

function clamavPort() {
  const value = Number(process.env.CLAMAV_PORT ?? DEFAULT_PORT);
  return Number.isInteger(value) && value > 0 && value <= 65535 ? value : DEFAULT_PORT;
}

/** Scan a buffer through a ClamAV daemon using the INSTREAM protocol. */
export async function scanBufferWithClamAV(buffer: Buffer): Promise<FileScanResult> {
  const host = clamavHost();
  if (!host) return { status: "unavailable", reason: "CLAMAV_HOST is not configured." };

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: clamavPort() });
    let response = "";
    let settled = false;

    const finish = (result: FileScanResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({ status: "unavailable", reason: "Antivirus scan timed out." });
    }, SCAN_TIMEOUT_MS);

    socket.setNoDelay(true);
    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length, 0);
        socket.write(length);
        socket.write(chunk);
      }
      const end = Buffer.alloc(4);
      end.writeUInt32BE(0, 0);
      socket.write(end);
    });

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (/FOUND/i.test(response)) {
        clearTimeout(timeout);
        finish({ status: "infected", reason: response.trim() });
      } else if (/OK\s*$/i.test(response)) {
        clearTimeout(timeout);
        finish({ status: "clean" });
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      finish({ status: "unavailable", reason: error instanceof Error ? error.message : "Antivirus connection failed." });
    });

    socket.on("close", () => {
      clearTimeout(timeout);
      if (!settled) {
        finish({ status: "unavailable", reason: response.trim() || "Antivirus connection closed before a result." });
      }
    });
  });
}

export function requireFileScanInProduction() {
  return process.env.NODE_ENV === "production" || process.env.SECURITY_FILE_SCAN_REQUIRED === "true";
}
