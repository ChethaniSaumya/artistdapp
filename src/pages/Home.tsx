import React, { useState, useEffect, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PhoneInput from 'react-phone-number-input';
import '../mobileNumber.css';
import '../App.css';
import '../Home.css';
import { createSlug } from '../utils/urlUtils';

// Type definitions
interface Artist {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
}

interface Project {
  id: string;
  projectName: string;
  projectSymbol: string;
  totalSupply: number;
  mintPrice: number;
  royalties?: number;
  status: 'pending' | 'approved' | 'rejected';
  imageIpfsUrl?: string;
  imageUrl?: string;
  createdAt: string;
  rejectionReason?: string;
  contractOwner?: string; // Add this line
}

interface FormData {
  projectName: string;
  projectSymbol: string;
  image: File | null;
  totalSupply: string;
  mintPrice: string;
  contractOwner: string;
  royalties: string;
}

interface LoginFormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

interface Message {
  text: string;
  type: 'success' | 'error' | 'info';
}

interface FieldErrors {
  name?: string;
  email?: string;
  mobile?: string;
  password?: string;
}

interface TouchedFields {
  name?: boolean;
  email?: boolean;
  mobile?: boolean;
  password?: boolean;
}

const Home: React.FC = () => {
  const [artistData, setArtistData] = useState<Artist | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [projectsPerPage] = useState<number>(6);

  // Login Modal States
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginMessage, setLoginMessage] = useState<Message | null>(null);
  const [projectNameAvailable, setProjectNameAvailable] = useState<boolean | null>(null);
  const [projectSymbolAvailable, setProjectSymbolAvailable] = useState<boolean | null>(null);
  const [checkingProjectName, setCheckingProjectName] = useState<boolean>(false);
  const [checkingProjectSymbol, setCheckingProjectSymbol] = useState<boolean>(false);

  const checkProjectSymbolAvailability = async (projectSymbol: string) => {
    if (!projectSymbol.trim() || projectSymbol.trim().length < 1) {
      setProjectSymbolAvailable(null);
      return;
    }

    if (!artistData?.id) return;

    setCheckingProjectSymbol(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/check-project-symbol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectSymbol: projectSymbol.trim(),
          artistId: artistData.id
        })
      });

      const result = await response.json();
      setProjectSymbolAvailable(result.available);
    } catch (error) {
      console.error('Error checking project symbol:', error);
      setProjectSymbolAvailable(null);
    } finally {
      setCheckingProjectSymbol(false);
    }
  };

  const checkProjectNameAvailability = async (projectName: string) => {
    if (!projectName.trim() || projectName.trim().length < 2) {
      setProjectNameAvailable(null);
      return;
    }

    if (!artistData?.id) return;

    setCheckingProjectName(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/check-project-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectName: projectName.trim(),
          artistId: artistData.id
        })
      });

      const result = await response.json();
      setProjectNameAvailable(result.available);
    } catch (error) {
      console.error('Error checking project name:', error);
      setProjectNameAvailable(null);
    } finally {
      setCheckingProjectName(false);
    }
  };
  const [formData, setFormData] = useState<FormData>({
    projectName: "",
    projectSymbol: "",
    image: null,
    totalSupply: "",
    mintPrice: "",
    contractOwner: "",
    royalties: ""
  });

  // Login Form Data
  const [loginFormData, setLoginFormData] = useState<LoginFormData>({
    name: "",
    email: "",
    mobile: "",
    password: ""
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [polUsdPrice, setPolUsdPrice] = useState<number | null>(null);

  const API_BASE_URL = 'https://muse-be.onrender.com';

  useEffect(() => {
    const fetchPolPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=pol-ecosystem-token&vs_currencies=usd'
        );
        const data = await res.json();
        if (data['pol-ecosystem-token']?.usd) {
          setPolUsdPrice(data['pol-ecosystem-token'].usd);
          return;
        }
      } catch (_e) { /* try next source */ }

      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/pol-ecosystem-token?localization=false&tickers=false&community_data=false&developer_data=false'
        );
        const data = await res.json();
        if (data?.market_data?.current_price?.usd) {
          setPolUsdPrice(data.market_data.current_price.usd);
          return;
        }
      } catch (_e) { /* try next source */ }

      try {
        const res = await fetch(
          'https://api.binance.com/api/v3/ticker/price?symbol=POLUSDT'
        );
        const data = await res.json();
        if (data?.price) {
          setPolUsdPrice(parseFloat(data.price));
          return;
        }
      } catch (_e) { /* all sources failed */ }
    };

    fetchPolPrice();
  }, []);

  // Filter projects based on active tab
  const filteredProjects = userProjects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'approved') return project.status === 'approved';
    if (activeTab === 'pending') return project.status === 'pending';
    return true;
  });

  // Pagination logic
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstProject, indexOfLastProject);
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setShowProjectModal(false);
  };

  useEffect(() => {
    const checkAuth = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const artistIdFromUrl = urlParams.get('artistId');

      if (artistIdFromUrl) {
        console.log('🔍 Found artist ID in URL:', artistIdFromUrl);
        fetchArtistData(artistIdFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const storedArtistData = localStorage.getItem('artistData');
      console.log('🔍 Checking localStorage for artist data:', storedArtistData);

      if (storedArtistData) {
        try {
          const parsed: Artist = JSON.parse(storedArtistData);
          console.log('✅ Parsed artist data:', parsed);
          setArtistData(parsed);
          setIsAuthenticated(true);

          if (parsed && parsed.id) {
            console.log('✅ Fetching projects for artist ID:', parsed.id);
            fetchUserProjects(parsed.id);
          }
        } catch (error) {
          console.error('❌ Error parsing artist data:', error);
        }
      } else {
        console.log('⚠️ No artist data found');
      }
      setLoading(false);
    };

    const fetchArtistData = async (artistId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/artists/${artistId}`);
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('artistData', JSON.stringify(data.artist));
          setArtistData(data.artist);
          setIsAuthenticated(true);
          fetchUserProjects(data.artist.id);
        }
      } catch (error) {
        console.error('Error fetching artist data:', error);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const fetchUserProjects = async (artistId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/${artistId}/projects`);
      if (response.ok) {
        const data = await response.json();
        setUserProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset availability indicators when user types
    if (name === 'projectName') {
      setProjectNameAvailable(null);
    }
    if (name === 'projectSymbol') {
      setProjectSymbolAvailable(null);
    }
  };


  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({
          text: "Image size must be less than 10MB",
          type: "error"
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setMessage({
          text: "Please select a valid image file",
          type: "error"
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      setMessage(null);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    if (!formData.projectName.trim()) {
      setMessage({ text: "Project name is required", type: "error" });
      return false;
    }

    if (!formData.projectSymbol.trim()) {
      setMessage({ text: "Project symbol is required", type: "error" });
      return false;
    }

    if (formData.projectSymbol.length > 10) {
      setMessage({ text: "Project symbol must be 10 characters or less", type: "error" });
      return false;
    }

    // Check project name availability
    setMessage({ text: "Checking project name availability...", type: "info" });
    await checkProjectNameAvailability(formData.projectName);

    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 100));

    if (projectNameAvailable === false) {
      setMessage({ text: "Project name is already taken. Please choose a different name.", type: "error" });
      return false;
    }

    // Check project symbol availability
    setMessage({ text: "Checking project symbol availability...", type: "info" });
    await checkProjectSymbolAvailability(formData.projectSymbol);

    // Wait a bit for state to update
    await new Promise(resolve => setTimeout(resolve, 100));

    if (projectSymbolAvailable === false) {
      setMessage({ text: "Project symbol is already taken. Please choose a different symbol.", type: "error" });
      return false;
    }

    if (!formData.totalSupply || parseInt(formData.totalSupply) < 1) {
      setMessage({ text: "Total supply must be at least 1", type: "error" });
      return false;
    }

    if (!formData.mintPrice || parseFloat(formData.mintPrice) < 0) {
      setMessage({ text: "Mint price cannot be negative", type: "error" });
      return false;
    }
    if (!formData.royalties || parseFloat(formData.royalties) < 0) {
      setMessage({ text: "Royalties cannot be negative", type: "error" });
      return false;
    }

    if (parseFloat(formData.royalties) > 100) {
      setMessage({ text: "Royalties cannot exceed 100%", type: "error" });
      return false;
    }

    if (!formData.contractOwner.trim()) {
      setMessage({ text: "Contract owner wallet address is required", type: "error" });
      return false;
    }

    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(formData.contractOwner.trim())) {
      setMessage({ text: "Please enter a valid Ethereum wallet address (0x...)", type: "error" });
      return false;
    }

    if (!formData.image) {
      setMessage({ text: "Project image is required", type: "error" });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    if (!artistData || !artistData.id) {
      setMessage({ text: "Authentication error. Please log in again.", type: "error" });
      return;
    }

    setSubmitting(true);
    setMessage({ text: "Creating project...", type: "info" });

    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        if (formData.image) {
          reader.readAsDataURL(formData.image);
        } else {
          reject(new Error("No image selected"));
        }
      });

      const submitData = {
        artistId: artistData.id,
        projectName: formData.projectName.trim(),
        projectSymbol: formData.projectSymbol.trim().toUpperCase(),
        totalSupply: parseInt(formData.totalSupply),
        mintPrice: parseFloat(formData.mintPrice),
        contractOwner: formData.contractOwner.trim(),
        royalties: parseFloat(formData.royalties),
        image: imageBase64
      };

      const response = await fetch(`${API_BASE_URL}/api/artists/create-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          text: "Project created successfully! It's now pending approval.",
          type: "success"
        });

        // Reset form data and availability states
        setFormData({
          projectName: "",
          projectSymbol: "",
          image: null,
          totalSupply: "",
          mintPrice: "",
          contractOwner: "",
          royalties: ""
        });
        setProjectNameAvailable(null);
        setProjectSymbolAvailable(null);
        setPreviewUrl(null);
        fetchUserProjects(artistData.id);

        const fileInput = document.getElementById('image') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } else {
        setMessage({
          text: result.error || 'Error creating project',
          type: "error"
        });

        // Handle specific error cases
        if (result.error && result.error.includes('already exists')) {
          // If it's a duplication error, reset the availability states
          if (result.error.includes('project name')) {
            setProjectNameAvailable(false);
          } else if (result.error.includes('project symbol')) {
            setProjectSymbolAvailable(false);
          }
        }
      }
    } catch (error) {
      console.error('Error submitting project:', error);
      setMessage({
        text: 'Network error. Please check your connection and try again.',
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('artistData');
    localStorage.removeItem('artistToken');
    setArtistData(null);
    setIsAuthenticated(false);
    setUserProjects([]);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  // Login Modal Functions
  const validateEmail = (email: string): string => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validateName = (name: string): string => {
    if (!name) return "Name is required";
    if (name.length > 30) return "Name must be 30 characters or less";
    if (name.length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const validateMobile = (mobile: string): string => {
    if (!mobile) return "Mobile number is required";
    // Extract only digits from the entire number
    const digitsOnly = mobile.replace(/\D/g, '');
    if (digitsOnly.length < 10) return "Please enter a valid mobile number";
    if (digitsOnly.length > 15) return "Phone number cannot exceed 15 digits";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name': return validateName(value);
      case 'email': return validateEmail(value);
      case 'mobile': return validateMobile(value);
      case 'password': return validatePassword(value);
      default: return "";
    }
  };

  const handleLoginInputChange = (name: keyof LoginFormData, value: string) => {
    if (name === 'name' && value.length > 30) {
      return;
    }

    setLoginFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const error = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));

    if (loginMessage) {
      setLoginMessage(null);
    }
  };

  const handleMobileChange = (value: string | undefined) => {
    const mobileValue = value || "";
    setLoginFormData(prev => ({
      ...prev,
      mobile: mobileValue
    }));

    setTouched(prev => ({
      ...prev,
      mobile: true
    }));

    const error = validateMobile(mobileValue);
    setFieldErrors(prev => ({
      ...prev,
      mobile: error
    }));

    if (loginMessage) {
      setLoginMessage(null);
    }
  };

  const validateLoginForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!isLogin) {
      errors.name = validateName(loginFormData.name);
      errors.mobile = validateMobile(loginFormData.mobile);
    }

    errors.email = validateEmail(loginFormData.email);
    errors.password = validatePassword(loginFormData.password);

    setFieldErrors(errors);

    const touchedFields: TouchedFields = {};
    Object.keys(loginFormData).forEach(key => {
      touchedFields[key as keyof LoginFormData] = true;
    });
    setTouched(touchedFields);

    return Object.values(errors).every(error => !error);
  };

  const showLoginMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setLoginMessage({ text, type });
    setTimeout(() => {
      setLoginMessage(null);
    }, 5000);
  };

  const resetLoginForm = () => {
    setLoginFormData({
      name: "",
      email: "",
      mobile: "",
      password: ""
    });
    setFieldErrors({});
    setTouched({});
    setLoginMessage(null);
    setShowPassword(false);
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) {
      showLoginMessage("Please fix the errors above", "error");
      return;
    }

    setIsLoggingIn(true);
    showLoginMessage("Logging in...", "info");

    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginFormData.email,
          password: loginFormData.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showLoginMessage("Login successful! Loading dashboard...", "success");

        localStorage.setItem('artistData', JSON.stringify(data.artist));
        setArtistData(data.artist);
        setIsAuthenticated(true);

        setTimeout(() => {
          setShowLoginModal(false);
          resetLoginForm();
          fetchUserProjects(data.artist.id);
          setLoading(false);
        }, 1500);
      } else {
        showLoginMessage(data.error || "Login failed", "error");
      }
    } catch (error) {
      console.error('Login error:', error);
      showLoginMessage("Login failed. Please check your connection and try again.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!validateLoginForm()) {
      showLoginMessage("Please fix the errors above", "error");
      return;
    }

    setIsLoggingIn(true);
    showLoginMessage("Creating account...", "info");

    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loginFormData.name.trim(),
          email: loginFormData.email.toLowerCase().trim(),
          mobile: loginFormData.mobile,
          password: loginFormData.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showLoginMessage("Registration successful! You can now log in.", "success");
        setTimeout(() => {
          setIsLogin(true);
          resetLoginForm();
        }, 2000);
      } else {
        showLoginMessage(data.error || "Registration failed", "error");
      }
    } catch (error) {
      console.error('Registration error:', error);
      showLoginMessage("Registration failed. Please check your connection and try again.", "error");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="auth-screen">
          <div className="auth-content">
            <h2 className="auth-title">Artist Dashboard</h2>
            <p className="auth-subtitle">Please log in to access the artist dashboard.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="auth-button"
            >
              Login
            </button>
          </div>
        </div>

        {/* Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="login-modal-overlay"
              onClick={() => setShowLoginModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="login-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="login-modal-close"
                >
                  <i className="fas fa-times"></i>
                </button>

                <div className="login-modal-header">
                  <h2 className="login-modal-title">
                    {isLogin ? "Artist Login" : "Artist Registration"}
                  </h2>
                </div>

                {/* Message Display */}
                <AnimatePresence>
                  {loginMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={`login-message login-message-${loginMessage.type}`}
                    >
                      {loginMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="login-form-container">
                  {/* Name Field - Registration Only */}
                  {!isLogin && (
                    <div className="login-form-group">
                      <label className="login-form-label">
                        Full Name <span className="login-required">*</span>
                        <span className="login-char-count">
                          ({loginFormData.name.length}/30 characters)
                        </span>
                      </label>
                      <div className="login-input-wrapper">
                        <input
                          type="text"
                          value={loginFormData.name}
                          onChange={(e) => handleLoginInputChange('name', e.target.value)}
                          className={`login-input ${touched.name && fieldErrors.name ? 'login-input-error' : ''}`}
                          placeholder="Enter your full name (max 30 chars)"
                          disabled={isLoggingIn}
                          maxLength={30}
                        />
                      </div>
                      {touched.name && fieldErrors.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="login-error-text"
                        >
                          {fieldErrors.name}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="login-form-group">
                    <label className="login-form-label">
                      Email Address <span className="login-required">*</span>
                    </label>
                    <div className="login-input-wrapper">
                      <input
                        type="email"
                        value={loginFormData.email}
                        onChange={(e) => handleLoginInputChange('email', e.target.value)}
                        className={`login-input ${touched.email && fieldErrors.email ? 'login-input-error' : ''}`}
                        placeholder="Enter your email"
                        disabled={isLoggingIn}
                      />
                    </div>
                    {touched.email && fieldErrors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="login-error-text"
                      >
                        {fieldErrors.email}
                      </motion.p>
                    )}
                  </div>

                  {/* Mobile Number Field - Registration Only */}
                  {!isLogin && (
                    <div className="login-form-group">
                      <label className="login-form-label">
                        Mobile Number <span className="login-required">*</span>
                        <span className="login-char-count" style={{ fontSize: '0.75rem' }}>
                          (max 15 digits)
                        </span>
                      </label>
                      <PhoneInput
                        international
                        defaultCountry="US"
                        value={loginFormData.mobile}
                        onChange={handleMobileChange}
                        className={`phone-input-custom ${touched.mobile && fieldErrors.mobile ? 'phone-input-error' : ''}`}
                        disabled={isLoggingIn}
                        countryCallingCodeEditable={false}
                        numberInputProps={{
                          maxLength: 19
                        }}
                      />

                      {touched.mobile && fieldErrors.mobile && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="login-error-text"
                        >
                          {fieldErrors.mobile}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* Password Field */}
                  <div className="login-form-group">
                    <label className="login-form-label">
                      Password <span className="login-required">*</span>
                      {!isLogin && <span className="login-char-count">(min 6 characters)</span>}
                    </label>
                    <div className="login-password-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginFormData.password}
                        onChange={(e) => handleLoginInputChange('password', e.target.value)}
                        className={`login-input login-input-password ${touched.password && fieldErrors.password ? 'login-input-error' : ''}`}
                        placeholder="Enter password"
                        disabled={isLoggingIn}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="login-password-toggle"
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                    {touched.password && fieldErrors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="login-error-text"
                      >
                        {fieldErrors.password}
                      </motion.p>
                    )}
                  </div>

                  <motion.button
                    onClick={isLogin ? handleLogin : handleRegister}
                    disabled={isLoggingIn}
                    whileHover={{ scale: isLoggingIn ? 1 : 1.02 }}
                    whileTap={{ scale: isLoggingIn ? 1 : 0.98 }}
                    className={`login-submit-button ${isLoggingIn ? 'login-submit-button-loading' : ''}`}
                  >
                    {isLoggingIn ? (
                      <div className="login-loading-container">
                        <div className="login-spinner"></div>
                        <span>{isLogin ? "Logging in..." : "Creating account..."}</span>
                      </div>
                    ) : (
                      isLogin ? "Login" : "Register"
                    )}
                  </motion.button>

                  <div className="login-toggle-container">
                    <p className="login-toggle-text">
                      {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                      <button
                        onClick={() => {
                          setIsLogin(!isLogin);
                          resetLoginForm();
                        }}
                        className="login-toggle-button"
                        disabled={isLoggingIn}
                      >
                        {isLogin ? "Register" : "Login"}
                      </button>
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-title">
          <h1 className="title-gradient">Artist Dashboard</h1>
        </div>
        <div className="header-actions">
          <span className="welcome-text">Welcome, {artistData?.name}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Project Creation Form */}
          <div className="form-section">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <i className="fas fa-upload"></i>
                  Create New Project
                </h2>
              </div>

              {/* Status Message */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`status-message status-message-${message.type}`}
                >
                  {message.text}
                </motion.div>
              )}

              <div className="form-container">
                <div className="form-grid">
                  {/* Project Name */}
                  {/* Project Name */}
                  <div className="form-group">
                    <label htmlFor="projectName" className="form-label">
                      Project Name
                      {projectNameAvailable !== null && formData.projectName.trim() && (
                        <span className={`availability-indicator ${projectNameAvailable ? 'available' : 'taken'}`}>
                          {projectNameAvailable ? '✓ Available' : '✗ Taken'}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="projectName"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      className={`form-input ${projectNameAvailable === false && formData.projectName.trim() ? 'input-error' : ''
                        } ${projectNameAvailable === true && formData.projectName.trim() ? 'input-success' : ''
                        }`}
                      placeholder="Enter project name"
                      disabled={submitting}
                      required
                    />
                  </div>

                  {/* Project Symbol */}
                  <div className="form-group">
                    <label htmlFor="projectSymbol" className="form-label">
                      Project Symbol
                      {projectSymbolAvailable !== null && formData.projectSymbol.trim() && (
                        <span className={`availability-indicator ${projectSymbolAvailable ? 'available' : 'taken'}`}>
                          {projectSymbolAvailable ? '✓ Available' : '✗ Taken'}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      id="projectSymbol"
                      name="projectSymbol"
                      value={formData.projectSymbol}
                      onChange={handleInputChange}
                      className={`form-input ${projectSymbolAvailable === false && formData.projectSymbol.trim() ? 'input-error' : ''
                        } ${projectSymbolAvailable === true && formData.projectSymbol.trim() ? 'input-success' : ''
                        }`}
                      placeholder="e.g., MUSE"
                      maxLength={10}
                      disabled={submitting}
                      required
                    />
                    <small className="form-hint">Maximum 10 characters</small>
                  </div>

                  {/* Total Supply */}
                  <div className="form-group">
                    <label htmlFor="totalSupply" className="form-label">Total Supply</label>
                    <input
                      type="number"
                      id="totalSupply"
                      name="totalSupply"
                      value={formData.totalSupply}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Number of tokens"
                      min="1"
                      disabled={submitting}
                      required
                    />
                  </div>

                  {/* Mint Price */}
                  <div className="form-group">
                    <label htmlFor="mintPrice" className="form-label">Mint Price (POL)</label>
                    <input
                      type="number"
                      id="mintPrice"
                      name="mintPrice"
                      value={formData.mintPrice}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Price per token"
                      step="0.001"
                      min="0"
                      disabled={submitting}
                      required
                    />
                  </div>

                  {/* Royalties */}
                  <div className="form-group">
                    <label htmlFor="royalties" className="form-label">Royalties (%)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        id="royalties"
                        name="royalties"
                        value={formData.royalties}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                            handleInputChange(e);
                          }
                        }}
                        className="form-input"
                        placeholder="e.g., 5"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={submitting}
                        required
                        style={{ paddingRight: '40px' }}
                      />
                    </div>
                    <small className="form-hint">Percentage of secondary sales (0-100)</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="contractOwner" className="form-label">Contract Owner (Wallet Address)</label>
                    <input
                      type="text"
                      id="contractOwner"
                      name="contractOwner"
                      value={formData.contractOwner}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="0x..."
                      disabled={submitting}
                      required
                    />
                    <small className="form-hint">
                      Your wallet address that will own the smart contract
                    </small>
                  </div>

                  {/* Image Upload */}
                  <div className="form-group form-group-full">
                    <label htmlFor="image" className="form-label">Project Image</label>
                    <div className="upload-container">
                      <input
                        type="file"
                        id="image"
                        name="image"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="file-input"
                        disabled={submitting}
                        required
                      />
                      <label htmlFor="image" className="upload-label">
                        <div className="upload-area">
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="preview-image" />
                          ) : (
                            <>
                              <i className="fas fa-cloud-upload-alt upload-icon"></i>
                              <span className="upload-text">Click to upload image</span>
                              <small className="upload-hint">PNG, JPG, GIF up to 10MB</small>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={handleSubmit}
                  className="submit-button"
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating Project...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="projects-section">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-list"></i>
                  Your Projects
                </h3>
              </div>

              {/* Tabs Navigation */}
              <div className="projects-tabs">
                <button
                  className={`tab-button ${activeTab === 'all' ? 'tab-button-active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Projects
                </button>
                <button
                  className={`tab-button ${activeTab === 'approved' ? 'tab-button-active' : ''}`}
                  onClick={() => setActiveTab('approved')}
                >
                  Approved
                </button>
                <button
                  className={`tab-button ${activeTab === 'pending' ? 'tab-button-active' : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending
                </button>
              </div>

              <div className="projects-list">
                {currentProjects.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-folder-open empty-state-icon"></i>
                    <p className="empty-state-text">
                      {activeTab === 'approved' ? 'No approved projects' :
                        activeTab === 'pending' ? 'No pending projects' :
                          'No projects yet'}
                    </p>
                    <small className="empty-state-subtext">
                      {activeTab === 'approved' ? 'No approved projects yet' :
                        activeTab === 'pending' ? 'No pending projects' :
                          'Create your first project to get started!'}
                    </small>
                  </div>
                ) : (
                  currentProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="project-card"
                      onClick={() => handleProjectClick(project)}
                    >
                      <div className="project-content">
                        <img
                          src={project.imageIpfsUrl || project.imageUrl || '/placeholder-image.jpg'}
                          alt={project.projectName}
                          className="project-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                          }}
                        />
                        <div className="project-details">
                          <h4 className="project-name">{project.projectName}</h4>
                          <div className="project-meta">
                            <span className={`status-badge ${getStatusBadgeClass(project.status)}`}>
                              {project.status === 'pending' ? 'Pending' :
                                project.status === 'approved' ? 'Approved' :
                                  project.status === 'rejected' ? 'Rejected' : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="project-arrow">
                          <i className="fas fa-chevron-right"></i>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination Info */}
              {filteredProjects.length > 0 && (
                <div className="pagination-info">
                  Showing {indexOfFirstProject + 1}-{Math.min(indexOfLastProject, filteredProjects.length)} of {filteredProjects.length} projects
                  {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                </div>
              )}

              {/* Pagination Controls */}
              {filteredProjects.length > projectsPerPage && (
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-btn-prev"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                    Previous
                  </button>

                  <div className="pagination-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                      <button
                        key={number}
                        className={`pagination-btn ${currentPage === number ? 'pagination-btn-active' : ''}`}
                        onClick={() => paginate(number)}
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  <button
                    className="pagination-btn pagination-btn-next"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Project Details Modal */}
            {showProjectModal && selectedProject && (
              <div className="modal-overlay_pd" onClick={handleCloseModal}>
                <div className="modal-content_pd" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header_pd">
                    <h3 className="modal-title_pd">Project Details</h3>
                    <button className="modal-close_pd" onClick={handleCloseModal}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <div className="modal-body_pd">
                    <div className="project-detail-grid_pd">
                      {/* Project Image */}
                      <div className="detail-section_pd detail-image-section_pd">
                        <img
                          src={selectedProject.imageIpfsUrl || selectedProject.imageUrl || '/placeholder-image.jpg'}
                          alt={selectedProject.projectName}
                          className="detail-image_pd"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                          }}
                        />
                      </div>

                      {/* Project Details */}
                      <div className="detail-section_pd detail-info-section_pd">
                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Project Name:</span>
                          <span className="detail-value_pd">{selectedProject.projectName}</span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Project Symbol:</span>
                          <span className="detail-value_pd detail-value-symbol_pd">
                            {selectedProject.projectSymbol}
                          </span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Total Supply:</span>
                          <span className="detail-value_pd">
                            {selectedProject.totalSupply?.toLocaleString()}
                          </span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Mint Price:</span>
                          <span className="detail-value_pd detail-value-price_pd">
                            {selectedProject.mintPrice} POL
                            {polUsdPrice && (
                              <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: '8px' }}>
                                {(() => {
                                  const usdValue = selectedProject.mintPrice * polUsdPrice;
                                  if (usdValue < 0.01) return `(≈ $${usdValue.toFixed(4)} USD)`;
                                  if (usdValue < 1) return `(≈ $${usdValue.toFixed(3)} USD)`;
                                  return `(≈ $${usdValue.toFixed(2)} USD)`;
                                })()}
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Royalties:</span>
                          <span className="detail-value_pd">
                            {selectedProject.royalties !== undefined && selectedProject.royalties !== null
                              ? `${selectedProject.royalties}%`
                              : 'N/A'}
                          </span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Contract Owner:</span>
                          <span className="detail-value_pd detail-value-address_pd">
                            {selectedProject.contractOwner}
                          </span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Status:</span>
                          <span className={`detail-value_pd status-badge_pd ${selectedProject.status === 'approved' ? 'status-approved_pd' :
                            selectedProject.status === 'rejected' ? 'status-rejected_pd' :
                              'status-pending_pd'
                            }`}>
                            {selectedProject.status === 'pending' ? 'Pending Approval' :
                              selectedProject.status === 'approved' ? 'Approved' :
                                selectedProject.status === 'rejected' ? 'Rejected' : 'Unknown'}
                          </span>
                        </div>

                        <div className="detail-row_pd">
                          <span className="detail-label_pd">Created:</span>
                          <span className="detail-value_pd">
                            {new Date(selectedProject.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {selectedProject.rejectionReason && (
                          <div className="rejection-section_pd">
                            <span className="rejection-label_pd">Rejection Reason:</span>
                            <p className="rejection-reason_pd">{selectedProject.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer_pd">
                    <button
                      className="modal-button_pd modal-button-secondary_pd"
                      onClick={handleCloseModal}
                    >
                      Close
                    </button>
                    {selectedProject.status === 'approved' && (
                      <button
                        className="modal-button_pd modal-button-primary_pd"
                        onClick={() => {
                          const artistSlug = createSlug(artistData?.name || 'artist');
                          const projectSlug = createSlug(selectedProject.projectName);
                          window.location.href = `/projects/${artistSlug}/${projectSlug}`;
                        }}
                      >
                        <i className="fas fa-coins"></i> Mint Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
