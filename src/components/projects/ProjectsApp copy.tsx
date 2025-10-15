import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ProjectsApp.css';

// RainbowKit imports
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useChainId, useSwitchChain, useWaitForTransactionReceipt, useDisconnect } from 'wagmi';
import { createPublicClient, formatEther, http } from 'viem';
import { polygon } from 'wagmi/chains';

// Type definitions
interface Project {
  id: string;
  projectName: string;
  artistName: string;
  imageIpfsUrl?: string;
  totalSupply?: number;
  mintPrice: number;
  mintingEnabled: boolean;
  contractAddress?: string;
  status: 'pending' | 'approved' | 'rejected';
  projectSymbol: string;
  rejectionReason?: string;
}

interface Message {
  text: string;
  type: 'success' | 'error' | 'info';
}

interface GalleryViewProps {
  projects: Project[];
  loading: boolean;
  onProjectClick: (projectId: string) => void;
}

interface ProjectViewProps {
  projectId: string;
  onBack: () => void;
}

// Properly typed NFT ABI
// Fix the ABI - make sure it matches the exact contract function signatures
const NFT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_mintAmount", type: "uint256" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "email", type: "string" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "publicSaleCost",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Main component that shows either gallery or individual project
const ProjectsApp: React.FC = () => {
  const [view, setView] = useState<'gallery' | 'project'>('gallery');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    if (projectId) {
      setSelectedProjectId(projectId);
      setView('project');
    } else {
      fetchProjects();
    }
  }, []);

  const fetchProjects = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (projectId: string): void => {
    setSelectedProjectId(projectId);
    setView('project');
    window.history.pushState({}, '', `?projectId=${projectId}`);
  };

  const handleBackToGallery = (): void => {
    setView('gallery');
    setSelectedProjectId(null);
    setLoading(true);
    fetchProjects();
    window.history.pushState({}, '', window.location.pathname);
  };

  if (view === 'project' && selectedProjectId) {
    return <ProjectView projectId={selectedProjectId} onBack={handleBackToGallery} />;
  }

  return <GalleryView projects={projects} loading={loading} onProjectClick={handleProjectClick} />;
};

// Gallery View Component
const GalleryView: React.FC<GalleryViewProps> = ({ projects, loading, onProjectClick }) => {
  if (loading) {
    return (
      <div className="loading-container" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="loading-text">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="projects-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)',
      padding: '48px 16px'
    }}>
      <div className="gallery-header">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gallery-title"
        >
          🎨 Art Projects Gallery
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="gallery-subtitle"
        >
          Discover and mint exclusive NFT collections from talented artists
        </motion.p>
      </div>

      <div className="project-grid">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onProjectClick(project.id)}
            className="public-project-card"
          >
            <div className="project-card-image-container">
              <img
                src={project.imageIpfsUrl || '/placeholder.jpg'}
                alt={project.projectName}
                className="project-card-image"
                onError={(e) => {
                  e.target.src = '/placeholder.jpg';
                }}
              />
            </div>

            <div className="public-project-card-content">
              <h3 className="public-project-card-title">
                {project.projectName}
              </h3>

              <p className="public-project-card-artist">
                By {project.artistName}
              </p>

              <div className="project-card-info">
                <span className="project-card-supply">
                  Supply: {project.totalSupply?.toLocaleString()}
                </span>
                <span className="project-card-price">
                  {project.mintPrice} POL
                </span>
              </div>

              {project.mintingEnabled && (
                <div className="status-badge minting-live">
                  <span>✨ Minting Live</span>
                </div>
              )}

              {!project.mintingEnabled && project.contractAddress && (
                <div className="status-badge coming-soon">
                  <span>Coming Soon</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="empty-state"
        >
          <div className="empty-state-icon">📂</div>
          <p className="empty-state-text">
            No projects available yet. Check back soon!
          </p>
        </motion.div>
      )}
    </div>
  );
};

// Individual Project View Component
const ProjectView: React.FC<ProjectViewProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [minting, setMinting] = useState<boolean>(false);
  const [mintAmount, setMintAmount] = useState<number>(1);
  const [message, setMessage] = useState<Message | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // RainbowKit hooks
  const { address: walletAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const {
    writeContract,
    data: hash,
    error: writeContractError,
    isPending: isWriteContractPending
  } = useWriteContract();

  const API_BASE_URL = 'http://localhost:3001';

  // Public client for reading contract data
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http()
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  // Handle write contract errors
  useEffect(() => {
    if (writeContractError) {
      console.error('Contract write error:', writeContractError);
      const errorMessage = writeContractError.message || 'Unknown error';

      setMinting(false);

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        setMessage({ text: 'Transaction cancelled by user', type: 'error' });
      } else if (errorMessage.includes('balance') || errorMessage.includes('insufficient funds')) {
        setMessage({ text: 'Insufficient funds for gas fees', type: 'error' });
      } else {
        setMessage({ text: 'Transaction failed. Please try again.', type: 'error' });
      }
    }
  }, [writeContractError]);

  // Handle successful transaction hash
  useEffect(() => {
    if (hash && !txHash) {
      setTxHash(hash);
      setMessage({ text: 'Transaction submitted! Waiting for confirmation...', type: 'info' });
    }
  }, [hash, txHash]);

  const fetchProjectData = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setMessage({ text: 'Failed to load project', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Read contract data for pricing
  const { data: basePrice } = useReadContract({
    address: project?.contractAddress as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'publicSaleCost',
    query: { enabled: !!project?.contractAddress && isConnected }
  });

  const handleMint = async (): Promise<void> => {
    if (!isConnected || !walletAddress) {
      setMessage({ text: 'Please connect your wallet first', type: 'error' });
      return;
    }

    if (!project?.contractAddress) {
      setMessage({ text: 'Project contract address not found', type: 'error' });
      return;
    }

    // Ensure we're on Polygon network
    if (chainId !== polygon.id) {
      try {
        await switchChain?.({ chainId: polygon.id });
        // Add a small delay to allow network switch
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        setMessage({ text: 'Please switch to Polygon network to mint', type: 'error' });
        return;
      }
    }

    setMinting(true);
    setMessage({ text: 'Initiating mint transaction...', type: 'info' });

    try {
      // Calculate total price - use the price from contract or fallback to project.mintPrice
      const pricePerNFT = basePrice || BigInt(0);
      const totalPrice = pricePerNFT * BigInt(mintAmount);

      console.log("Minting details:", {
        contractAddress: project.contractAddress,
        mintAmount,
        totalPrice: totalPrice.toString(),
        pricePerNFT: pricePerNFT.toString()
      });

      // Use RainbowKit's writeContract with proper typing
      // Replace the writeContract call with this:
      writeContract({
        address: project.contractAddress as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(mintAmount), "Collector", walletAddress],
        value: totalPrice,
      } as any); // Use 'as any' to bypass TypeScript errors temporarily

    } catch (error: any) {
      console.error('Minting error:', error);
      setMinting(false);
      setMessage({
        text: error.message || 'Minting failed. Please try again.',
        type: 'error'
      });
    }
  };

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash) {
      setMinting(false);
      setMessage({
        text: `Successfully minted ${mintAmount} NFT(s)!`,
        type: 'success'
      });

      // Refresh project data
      fetchProjectData();

      // Reset mint amount
      setMintAmount(1);
      setTxHash(undefined);
    }
  }, [isConfirmed, txHash]);

  if (loading) {
    return (
      <div className="loading-container" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="loading-text">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="loading-container" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-text" style={{ marginBottom: '20px' }}>
            Project not found
          </div>
          <button onClick={onBack} className="back-button">
            ← Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const canMint = project.status === 'approved' &&
    project.contractAddress &&
    project.mintingEnabled;

  const isMintDisabled = minting || isConfirming || !isConnected || !canMint;

  // Calculate display price - use contract price or fallback to project price
  const displayPricePerNFT = basePrice ? Number(formatEther(basePrice)) : project.mintPrice;

  return (
    <div className="projects-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)',
      padding: '48px 16px'
    }}>
      <div className="project-view-container">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onBack}
          className="back-button"
        >
          ← Back to Gallery
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="project-header"
        >
          <h1 className="project-main-title">
            {project.projectName}
          </h1>
          <p className="project-symbol">
            ${project.projectSymbol}
          </p>
          <div className="project-artist-badge">
            By {project.artistName}
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="project-content-grid">
          {/* Project Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="project-image-section"
          >
            <img
              src={project.imageIpfsUrl || '/placeholder.jpg'}
              alt={project.projectName}
              className="project-main-image"
              onError={(e) => {
                e.target.src = '/placeholder.jpg';
              }}
            />
          </motion.div>

          {/* Project Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="project-details-section"
          >
            <h2 className="public-project-details-title">
              Project Details
            </h2>

            <div>
              <div className="detail-row">
                <span className="detail-label">Total Supply</span>
                <span className="detail-value">
                  {project.totalSupply?.toLocaleString()}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Mint Price</span>
                <span className="detail-value">
                  {displayPricePerNFT} POL
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`detail-value ${project.status === 'approved' ? 'status-approved' :
                  project.status === 'pending' ? 'status-pending' :
                    'status-rejected'
                  }`}>
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
              </div>

              {project.contractAddress && (
                <div className="contract-address-box">
                  <span className="contract-address-label">Contract</span>
                  <span className="contract-address-value">
                    {project.contractAddress}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Minting Section */}
        {canMint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="minting-section"
          >
            <h2 className="minting-title">
              🎨 Mint Your NFT
            </h2>

            {/* Message Display */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`minting-message ${message.type}`}
              >
                <p>{message.text}</p>
              </motion.div>
            )}

            {!isConnected ? (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="connect-wallet-button"
                  >
                    Connect Wallet to Mint
                  </button>
                )}
              </ConnectButton.Custom>
            ) : (
              <div>
                <div className="minting-controls">
                  <label className="amount-label">
                    Amount to Mint
                  </label>
                  <div className="amount-selector">
                    <button
                      onClick={() => setMintAmount(Math.max(1, mintAmount - 1))}
                      disabled={minting || isConfirming}
                      className="amount-button"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={minting || isConfirming}
                      className="amount-input"
                      min="1"
                    />
                    <button
                      onClick={() => setMintAmount(mintAmount + 1)}
                      disabled={minting || isConfirming}
                      className="amount-button"
                    >
                      +
                    </button>
                  </div>

                  {/* Price display */}
                  <p className="total-price">
                    Total: {(displayPricePerNFT * mintAmount).toFixed(4)} POL
                  </p>
                </div>

                <button
                  onClick={handleMint}
                  disabled={isMintDisabled}
                  className="mint-button"
                >
                  {(minting || isConfirming) ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div className="spinner"></div>
                      {isConfirming ? 'Confirming...' : 'Minting...'}
                    </span>
                  ) : (
                    `Mint ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}`
                  )}
                </button>

                <div className="wallet-connection-info">
                  <p className="wallet-info">
                    Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                    {chainId !== polygon.id && (
                      <span style={{ color: 'orange', marginLeft: '10px' }}>
                        (Please switch to Polygon)
                      </span>
                    )}
                  </p>

                  {/* Disconnect Button */}
                  <button
                    onClick={() => disconnect()}
                    className="disconnect-wallet-button"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* Pending Status Message */}
        {project.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="status-message-box pending"
          >
            <p className="status-message-text">
              ⏳ This project is pending approval. Minting will be available once approved by admin.
            </p>
          </motion.div>
        )}

        {/* Rejected Status Message */}
        {project.status === 'rejected' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="status-message-box rejected"
          >
            <p className="status-message-text">
              ❌ This project has been rejected
            </p>
            {project.rejectionReason && (
              <p className="status-message-reason">
                Reason: {project.rejectionReason}
              </p>
            )}
          </motion.div>
        )}

        {/* Not Yet Live Message */}
        {project.status === 'approved' && project.contractAddress && !project.mintingEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="status-message-box not-live"
          >
            <p className="status-message-text">
              🚀 This project is approved but minting is not yet enabled. Check back soon!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProjectsApp;