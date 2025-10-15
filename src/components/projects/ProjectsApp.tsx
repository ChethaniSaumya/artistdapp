import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ProjectsApp.css';

// RainbowKit imports
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useChainId, useSwitchChain, useWaitForTransactionReceipt, useDisconnect } from 'wagmi';
import { createPublicClient, formatEther, http } from 'viem';
import { polygon } from 'wagmi/chains';

// URL Utility Functions
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const decodeSlug = (slug: string): string => {
  return slug
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Type definitions
interface Project {
  id: string;
  projectName: string;
  artistName: string;
  artistId?: string;
  imageIpfsUrl?: string;
  coverImageIpfsUrl?: string;
  backgroundColor?: string;
  description?: string;
  totalSupply?: number;
  mintPrice: number;
  mintingEnabled: boolean;
  contractAddress?: string;
  status: 'pending' | 'approved' | 'rejected';
  projectSymbol: string;
  rejectionReason?: string;
}

interface Artist {
  id: string;
  name: string;
  email?: string;
}

interface Message {
  text: string;
  type: 'success' | 'error' | 'info';
}

interface GalleryViewProps {
  projects: Project[];
  loading: boolean;
  onProjectClick: (project: Project) => void;
}

interface ProjectViewProps {
  artistName: string;
  projectName: string;
  onBack: () => void;
}

// NFT ABI
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

const ProjectsApp: React.FC = () => {
  const [view, setView] = useState<'gallery' | 'project'>('gallery');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE_URL = 'https://muse-be.onrender.com';

  useEffect(() => {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p);
    
    if (pathParts.length === 3 && pathParts[0] === 'projects') {
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

  const handleProjectClick = (project: Project): void => {
    const artistSlug = createSlug(project.artistName);
    const projectSlug = createSlug(project.projectName);
    const newUrl = `/projects/${artistSlug}/${projectSlug}`;
    
    setView('project');
    window.history.pushState({}, '', newUrl);
  };

  const handleBackToGallery = (): void => {
    setView('gallery');
    setLoading(true);
    fetchProjects();
    window.history.pushState({}, '', '/projects');
  };

  const path = window.location.pathname;
  const pathParts = path.split('/').filter(p => p);
  const artistName = pathParts.length === 3 ? decodeSlug(pathParts[1]) : null;
  const projectName = pathParts.length === 3 ? decodeSlug(pathParts[2]) : null;

  if (view === 'project' && artistName && projectName) {
    return (
      <ProjectView 
        artistName={artistName}
        projectName={projectName}
        onBack={handleBackToGallery} 
      />
    );
  }

  return (
    <GalleryView 
      projects={projects} 
      loading={loading} 
      onProjectClick={handleProjectClick} 
    />
  );
};

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
            onClick={() => onProjectClick(project)}
            className="public-project-card"
          >
            <div className="project-card-image-container">
              <img
                src={project.imageIpfsUrl || '/placeholder.jpg'}
                alt={project.projectName}
                className="project-card-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.jpg';
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

const ProjectView: React.FC<ProjectViewProps> = ({ artistName, projectName, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [minting, setMinting] = useState<boolean>(false);
  const [mintAmount, setMintAmount] = useState<number>(1);
  const [message, setMessage] = useState<Message | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCoverImage, setEditCoverImage] = useState<File | null>(null);
  const [editBackgroundColor, setEditBackgroundColor] = useState<string>('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [editMessage, setEditMessage] = useState<Message | null>(null);

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

  const API_BASE_URL = 'https://muse-be.onrender.com';

  const publicClient = createPublicClient({
    chain: polygon,
    transport: http()
  });

  useEffect(() => {
    fetchProjectData();
    checkOwnership();
  }, [artistName, projectName]);

  
  useEffect(() => {
    if (writeContractError) {
      console.error('Contract write error:', writeContractError);
      const errorMessage = writeContractError.message || 'Unknown error';
      setMinting(false);
      setTxHash(undefined); // Reset transaction hash

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        setMessage({ text: 'Transaction cancelled by user', type: 'error' });
      } else if (errorMessage.includes('balance') || errorMessage.includes('insufficient funds')) {
        setMessage({ text: 'Insufficient funds for gas fees', type: 'error' });
      } else {
        setMessage({ text: 'Transaction failed. Please try again.', type: 'error' });
      }
    }
  }, [writeContractError]);

  useEffect(() => {
    if (hash && !txHash) {
      setTxHash(hash);
      setMessage({ text: 'Transaction submitted! Waiting for confirmation...', type: 'info' });
    }
  }, [hash, txHash]);

  const checkOwnership = async (): Promise<void> => {
    try {
      const storedArtistData = localStorage.getItem('artistData');
      
      if (!storedArtistData) {
        setIsOwner(false);
        return;
      }

      const artistData: Artist = JSON.parse(storedArtistData);

      const response = await fetch(`${API_BASE_URL}/api/artists/verify-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artistData.id,
          projectName: projectName
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsOwner(data.isOwner);
        console.log('Owner verification:', data.isOwner);
      }
    } catch (error) {
      console.error('Error checking ownership:', error);
      setIsOwner(false);
    }
  };

  const fetchProjectData = async (): Promise<void> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/public/projects/${encodeURIComponent(artistName)}/${encodeURIComponent(projectName)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setEditDescription(data.project.description || '');
        setEditBackgroundColor(data.project.backgroundColor || '#1a202c');
      } else {
        setMessage({ text: 'Project not found', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setMessage({ text: 'Failed to load project', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setEditMessage({
          text: "Cover image must be less than 1MB",
          type: "error"
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setEditMessage({
          text: "Please select a valid image file",
          type: "error"
        });
        return;
      }

      setEditCoverImage(file);

      const reader = new FileReader();
      reader.onload = () => {
        setCoverPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      setEditMessage(null);
    }
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!project?.id) return;

    const storedArtistData = localStorage.getItem('artistData');
    if (!storedArtistData) {
      setEditMessage({ text: 'Please log in to edit', type: 'error' });
      return;
    }

    const artistData: Artist = JSON.parse(storedArtistData);

    setSaving(true);
    setEditMessage({ text: 'Saving changes...', type: 'info' });

    try {
      let coverImageBase64 = null;

      if (editCoverImage) {
        coverImageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(editCoverImage);
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/artists/projects/${project.id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artistData.id,
          description: editDescription,
          coverImage: coverImageBase64,
          backgroundColor: editBackgroundColor
        })
      });

      const result = await response.json();

      if (response.ok) {
        setEditMessage({ text: 'Changes saved successfully!', type: 'success' });
        setTimeout(() => {
          setShowEditModal(false);
          fetchProjectData();
          setEditMessage(null);
          setCoverPreviewUrl(null);
          setEditCoverImage(null);
        }, 2000);
      } else {
        setEditMessage({ text: result.error || 'Failed to save changes', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      setEditMessage({ text: 'Failed to save changes. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

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

    if (chainId !== polygon.id) {
      try {
        await switchChain?.({ chainId: polygon.id });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        setMessage({ text: 'Please switch to Polygon network to mint', type: 'error' });
        return;
      }
    }

    setMinting(true);
    setMessage({ text: 'Initiating mint transaction...', type: 'info' });

    try {
      const pricePerNFT = basePrice || BigInt(0);
      const totalPrice = pricePerNFT * BigInt(mintAmount);

      writeContract({
        address: project.contractAddress as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(mintAmount), "Collector", walletAddress],
        value: totalPrice,
      } as any);

    } catch (error: any) {
      console.error('Minting error:', error);
      setMinting(false);
      setMessage({
        text: error.message || 'Minting failed. Please try again.',
        type: 'error'
      });
    }
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isConfirmed && txHash) {
      setMinting(false);
      setMessage({
        text: `Successfully minted ${mintAmount} NFT(s)!`,
        type: 'success'
      });

      fetchProjectData();
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
  const displayPricePerNFT = basePrice ? Number(formatEther(basePrice)) : project.mintPrice;

  return (
    <div className="projects-container" style={{
      minHeight: '100vh',
      background: project.backgroundColor 
        ? project.backgroundColor
        : 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)',
      padding: '48px 16px',
      position: 'relative'
    }}>
      <div className="project-view-container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onBack}
          className="back-button"
        >
          ← Back to Gallery
        </motion.button>

        {/* Cover Image Section */}
        {project.coverImageIpfsUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="project-cover-image"
            style={{
              width: '100%',
              height: '350px',
              marginBottom: '30px',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <img
              src={project.coverImageIpfsUrl}
              alt={`${project.projectName} cover`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="project-header"
          style={{ position: 'relative' }}
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

          {/* Edit Button - Only visible to owner */}
          {isOwner && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowEditModal(true)}
              className="edit-project-button"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fas fa-edit"></i>
              Edit Project
            </motion.button>
          )}
        </motion.div>

        <div className="project-content-grid">
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
                (e.target as HTMLImageElement).src = '/placeholder.jpg';
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="project-details-section"
          >
            <h2 className="public-project-details-title">
              Project Details
            </h2>

            <div>
              {/* Description */}
              {project.description && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px 18px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  lineHeight: '1.7',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: '#e2e8f0',
                    fontSize: '15px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {project.description}
                  </p>
                </div>
              )}

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

        {canMint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="minting-section"
          >
            <h2 className="minting-title">
              🎨 Mint Your NFT
            </h2>

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

        {/* Edit Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="edit-modal-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
              }}
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="edit-modal-content"
                style={{
                  background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
                  borderRadius: '16px',
                  padding: '32px',
                  maxWidth: '600px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '32px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingBottom: '16px'
                }}>
                  <h2 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0
                  }}>
                    Edit Project
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#cbd5e0',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '8px',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#cbd5e0';
                    }}
                  >
                    ×
                  </button>
                </div>

                {editMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      background: editMessage.type === 'success' ? 'rgba(72, 187, 120, 0.2)' :
                                 editMessage.type === 'error' ? 'rgba(245, 101, 101, 0.2)' :
                                 'rgba(66, 153, 225, 0.2)',
                      color: editMessage.type === 'success' ? '#68d391' :
                             editMessage.type === 'error' ? '#fc8181' :
                             '#63b3ed',
                      border: `1px solid ${editMessage.type === 'success' ? '#68d391' :
                                          editMessage.type === 'error' ? '#fc8181' :
                                          '#63b3ed'}`
                    }}
                  >
                    {editMessage.text}
                  </motion.div>
                )}

                <div style={{ marginBottom: '28px' }}>
                  <label style={{
                    display: 'block',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    fontWeight: '600',
                    marginBottom: '10px',
                    letterSpacing: '0.3px'
                  }}>
                    Project Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Enter a description for your project..."
                    style={{
                      width: '100%',
                      minHeight: '140px',
                      padding: '14px 16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = '2px solid rgba(102, 126, 234, 0.5)';
                      e.target.style.background = 'rgba(15, 23, 42, 0.8)';
                    }}
                    onBlur={(e) => {
                      e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)';
                      e.target.style.background = 'rgba(15, 23, 42, 0.6)';
                    }}
                    disabled={saving}
                  />
                  <p style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    marginTop: '8px',
                    marginBottom: 0
                  }}>
                    Tell collectors about your project and what makes it special
                  </p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    fontWeight: '600',
                    marginBottom: '10px',
                    letterSpacing: '0.3px'
                  }}>
                    Cover Image
                  </label>
                  <p style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    marginBottom: '14px',
                    marginTop: 0
                  }}>
                    Recommended: 1400x350px (4:1 ratio), under 1MB • PNG, JPG, GIF, SVG, or WebP
                  </p>
                  
                  <input
                    type="file"
                    id="cover-image"
                    accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                    onChange={handleCoverImageChange}
                    style={{ display: 'none' }}
                    disabled={saving}
                  />
                  
                  <label
                    htmlFor="cover-image"
                    style={{
                      display: 'block',
                      padding: coverPreviewUrl || project.coverImageIpfsUrl ? '0' : '50px 20px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '2px dashed rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      textAlign: 'center',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    {coverPreviewUrl || project.coverImageIpfsUrl ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={coverPreviewUrl || project.coverImageIpfsUrl}
                          alt="Cover preview"
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '250px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            display: 'block'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <i className="fas fa-edit"></i>
                          Click to change
                        </div>
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-cloud-upload-alt" style={{
                          fontSize: '52px',
                          color: '#667eea',
                          marginBottom: '16px',
                          display: 'block'
                        }}></i>
                        <p style={{
                          color: '#e2e8f0',
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0 0 8px 0'
                        }}>
                          Click to upload cover image
                        </p>
                        <p style={{
                          color: '#94a3b8',
                          fontSize: '13px',
                          margin: 0
                        }}>
                          or drag and drop
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {/* Background Color Picker */}
                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    fontWeight: '600',
                    marginBottom: '10px',
                    letterSpacing: '0.3px'
                  }}>
                    Background Color
                  </label>
                  <p style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    marginBottom: '14px',
                    marginTop: 0
                  }}>
                    Choose a background color for your project page
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center'
                  }}>
                    <input
                      type="color"
                      value={editBackgroundColor}
                      onChange={(e) => setEditBackgroundColor(e.target.value)}
                      style={{
                        width: '80px',
                        height: '80px',
                        border: '3px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: 'transparent'
                      }}
                      disabled={saving}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <input
                          type="text"
                          value={editBackgroundColor}
                          onChange={(e) => setEditBackgroundColor(e.target.value)}
                          placeholder="#1a202c"
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                            transition: 'all 0.3s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.border = '2px solid rgba(102, 126, 234, 0.5)';
                          }}
                          onBlur={(e) => {
                            e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)';
                          }}
                          disabled={saving}
                        />
                      </div>
                      
                      {/* Preset Colors */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        {['#1a202c', '#2d3748', '#1e3a8a', '#065f46', '#7c2d12', '#881337', '#4c1d95', '#000000'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditBackgroundColor(color)}
                            disabled={saving}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: editBackgroundColor === color 
                                ? '3px solid white' 
                                : '2px solid rgba(255, 255, 255, 0.2)',
                              background: color,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                              if (!saving) {
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '14px',
                  marginTop: '36px',
                  paddingTop: '24px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '14px 28px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '2px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      opacity: saving ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '14px 28px',
                      background: saving 
                        ? 'rgba(102, 126, 234, 0.5)' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: saving ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                      }
                    }}
                  >
                    {saving ? (
                      <>
                        <div className="spinner" style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}></div>
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProjectsApp;
