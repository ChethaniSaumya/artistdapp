// wagmi.config.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import * as chains from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

const appName = import.meta.env.VITE_APP_NAME;
const projectId = import.meta.env.VITE_PROJECT_ID;
const network = import.meta.env.VITE_NETWORK as keyof typeof chains;

// Resolve chain dynamically from env
const selectedChain: Chain | undefined = chains[network];

if (!selectedChain) {
  throw new Error(
    `Invalid VITE_NETWORK: "${network}". Must be one of: ${Object.keys(chains).join(', ')}`
  );
}

export const config = getDefaultConfig({
  appName,
  projectId,
  chains: [selectedChain],
  ssr: true,
});
