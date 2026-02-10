import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";

export interface AuthRequest extends Request {
  wallet?: string;
}

/**
 * Middleware to verify wallet ownership via signed message.
 * Client signs a message "SkillForge:<timestamp>" with their wallet.
 * Headers: x-wallet-address, x-signature, x-timestamp
 */
export function authWallet(req: AuthRequest, res: Response, next: NextFunction) {
  const address = req.headers["x-wallet-address"] as string;
  const signature = req.headers["x-signature"] as string;
  const timestamp = req.headers["x-timestamp"] as string;

  if (!address || !signature || !timestamp) {
    return res.status(401).json({ error: "Missing auth headers", hint: "Include x-wallet-address, x-signature, x-timestamp" });
  }

  // Reject if timestamp is older than 5 minutes
  const ts = parseInt(timestamp);
  if (Date.now() - ts > 5 * 60 * 1000) {
    return res.status(401).json({ error: "Signature expired", hint: "Sign a fresh message" });
  }

  try {
    const message = `SkillForge:${timestamp}`;
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }
    req.wallet = address.toLowerCase();
    next();
  } catch (err) {
    return res.status(401).json({ error: "Signature verification failed" });
  }
}

/**
 * Optional auth - sets wallet if present but doesn't block
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const address = req.headers["x-wallet-address"] as string;
  const signature = req.headers["x-signature"] as string;
  const timestamp = req.headers["x-timestamp"] as string;

  if (address && signature && timestamp) {
    try {
      const message = `SkillForge:${timestamp}`;
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() === address.toLowerCase()) {
        req.wallet = address.toLowerCase();
      }
    } catch {}
  }
  next();
}