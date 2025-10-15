// wagmi.config.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Healthy Heroes',
  projectId: '8f76b1b5b05efbd3b4d262b8c46075d4',
  chains: [mainnet, sepolia],
  ssr: true,
});