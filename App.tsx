import React, { useState, useEffect, useRef } from 'react';
import { Project, CartItem, NavigationTab } from './types';
import { PROJECTS, SIDEBAR_CATEGORIES, LOGO_SVG } from './constants';
import { HeroCarousel } from './components/HeroCarousel';
import { ProjectCard } from './components/ProjectCard';
import { db } from './firebase'; 
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, arrayUnion, getDoc } from 'firebase/firestore';
// Define what an Order Status can be
type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
// ==========================================
// SYSTEM CONFIGURATION - ADMIN CREDENTIALS
// ==========================================
/*const ADMIN_CONFIG = {
  email: 'sheikhwalid017@gmail.com',
  password: 'sheikhwalid123',
  firstName: 'Admin',
  lastName: 'Root'
};
*/
const CATEGORY_PREFIXES: Record<string, string> = {
  'BREADBOARD PROJECTS': 'BBP',
  'ARDUINO PROJECTS': 'ARD',
  'ESP32 PROJECTS': 'ESP',
  'STM32 PROJECTS': 'STM',
  'CYBER PROJECTS': 'CYB',
  'RASBERRY PI PROJECTS': 'RPI',
  'BOT PROJECTS': 'BOT',
  'INDUSTRIAL PROJECTS': 'IND',
  'DRONE PROJECTS': 'DRN',
  'DRONE BODY AND PARTS': 'DBP',
  '3D PRINTED ACCESSORIES': '3DA',
  '3D PRINTER PARTS': '3DP',
  'BLUEPRINTS OF PROJECTS': 'BLP',
  'PRESENTATION SLIDE OF PROJECTS': 'SLD',
  'OPEN SOURCE CODES': 'OSC'
};

interface UserAddress {
  id: string;
  type: 'Home' | 'Billing' | 'Shipping';
  street: string;
  city: string;
  zip: string;
  country: string;
}

interface UserReview {
  id: string;
  projectId: string;
  projectName: string;
  rating: number;
  comment: string;
  date: string;
  userName?: string;
}

interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  status: 'Confirmed' | 'Shipped' | 'Delivered';
  trxId: string;
  shippingAddress?: UserAddress;
  billingAddress?: UserAddress;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: 'user' | 'admin';
  addresses: UserAddress[];
  orders: Order[];
  reviews: UserReview[];
}

// Helper components
function UserIconSmall() {
  return <svg className="w-6 h-6 text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>;
}

function AdminIconSmall() {
  return <svg className="w-6 h-6 text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2.5"/></svg>;
}

const AccountCard: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="bg-white p-12 border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-2xl hover:z-10 transition-all group min-h-[180px]">
    <div className="text-black group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[11px] font-black uppercase tracking-wider text-black text-center leading-tight max-w-[150px]">{label}</span>
  </button>
);

const App: React.FC = () => {
  // Persistence Initialization
// Start with empty arrays (Firebase will fill them instantly)
  const [inventory, setInventory] = useState<Project[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<UserData[]>([]);
  const [isSignUp, setIsSignUp] = useState(false);
// Keep the persistent session logic for currentUser (It's good UX)
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('cp_active_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('cp_active_session'));
// Add this with your other states
  // --- REVIEW SYSTEM STATE ---
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Project | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [viewingReceipt, setViewingReceipt] = useState<Order | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [authPersona, setAuthPersona] = useState<'user' | 'admin' | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authStep, setAuthStep] = useState<'persona' | 'form' | 'verification'>('persona');
  const [isSending, setIsSending] = useState(false);
  
  const [currentTab, setCurrentTab] = useState<NavigationTab>(NavigationTab.HOME);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState(0); // 0: Description, 1: Product Details, 2: Comments
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [accountSubView, setAccountSubView] = useState<'menu' | 'information' | 'addresses' | 'orders' | 'inventory' | 'reviews' | 'saved-carts' | 'confirmed-orders'>('menu');
  
  const [checkoutStep, setCheckoutStep] = useState<'info' | 'address' | 'payment' | null>(null);
  const [tempOrderId, setTempOrderId] = useState('');
  const [trxId, setTrxId] = useState('');
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState<Partial<UserAddress>>({
    type: 'Home', street: '', city: '', zip: '', country: 'Bangladesh'
  });
  const [isAddressTypeDropdownOpen, setIsAddressTypeDropdownOpen] = useState(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);

  // New States for "Add to Cart" Options Modal
  const [showCartOptionsModal, setShowCartOptionsModal] = useState(false);
  const [optionIEEE, setOptionIEEE] = useState(false);
  const [optionPPTX, setOptionPPTX] = useState(false);
  const [pendingAddition, setPendingAddition] = useState<{proj: Project, qty: number} | null>(null);

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<Partial<Project>>({
    name: '', 
    description: '', 
    detailedDescription: '',
    price: 0, 
    reference: '', 
    category: SIDEBAR_CATEGORIES[0], 
    inStock: true, 
    rating: 5, 
    reviewCount: 0, 
    image: '', 
    video: '', 
    specs: [],
    features: [],
    packageIncludes: [],
    detailedSpecs: {},
    purchasedRecently: 0,
    addedToCartRecently: 0,
    priceAdjustmentType: 'none', 
    priceAdjustmentAmount: 0
  });

  const [viewingItemsOrder, setViewingItemsOrder] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);

  // Verification States
  const [verificationInput, setVerificationInput] = useState('');
  const [systemOTP, setSystemOTP] = useState('');
  const [tempUser, setTempUser] = useState<UserData | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00'
  });

  useEffect(() => {
    const target = new Date();
    target.setHours(target.getHours() + 24); 

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = target.getTime() - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0')
      });

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Sync to Storage

// --- REAL-TIME DATABASE SYNC ---
  useEffect(() => {
    // 1. Listen to Inventory Changes
    const unsubInv = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const liveData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setInventory(liveData);
    });

    // 2. Listen to User Changes
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const liveUsers = snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() } as UserData));
      setVerifiedUsers(liveUsers);
      
      // Live-update the logged-in user if their data changes in the cloud
      if (currentUser) {
        const myProfile = liveUsers.find(u => u.email === currentUser.email);
        if (myProfile) {
           setCurrentUser(myProfile);
           localStorage.setItem('cp_active_session', JSON.stringify(myProfile));
        }
      }
    });

    return () => { unsubInv(); unsubUsers(); };
  }, [currentUser?.email]); // Re-attach listener if user email changes slightly

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const filteredInventory = inventory.filter(p => {
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.reference.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(event.target as Node)) {
        setIsAddressTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // --- SESSION SYNC ---
  // Automatically save the logged-in user to storage whenever data changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cp_active_session', JSON.stringify(currentUser));
      setIsLoggedIn(true);
    } else {
      // If user logs out (currentUser becomes null), clear the storage
      localStorage.removeItem('cp_active_session');
      setIsLoggedIn(false);
    }
  }, [currentUser]);

  const addNotification = (text: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.toLowerCase().trim();

    // --- 1. SPECIAL ADMIN CHECK (Hardcoded) ---
    if (normalizedEmail === 'admin@gmail.com' && password === 'admin123') { 
      const adminUser: UserData = {
        firstName: 'Master',
        lastName: 'Admin',
        email: normalizedEmail,
        phone: '01700000000',
        password: password,
        role: 'admin', 
        addresses: [],
        orders: [],
        reviews: []
      };
      setCurrentUser(adminUser);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      addNotification("Welcome back, Commander.");
      return; 
    }

    // --- 2. REGULAR USER LOGIC ---
    
    // CHANGED THIS LINE: We now check 'authMode' instead of 'isSignUp'
    if (authMode === 'signup') { 
      if (!firstName || !lastName || !phone) {
        addNotification("Please fill in all fields.");
        return;
      }

      try {
        const userRef = doc(db, "users", normalizedEmail);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          addNotification("User already exists. Please log in.");
          return;
        }

        const newUser: UserData = { 
           firstName, lastName, email: normalizedEmail, phone, password, 
           role: 'user', addresses: [], orders: [], reviews: [] 
        };

        await setDoc(userRef, newUser);
        
        setCurrentUser(newUser);
        setIsLoggedIn(true);
        setShowAuthModal(false);
        addNotification(`Welcome, ${firstName}!`);
        
      } catch (error) {
        console.error("Signup Error:", error);
        addNotification("Signup failed.");
      }

    // LOG IN LOGIC
    } else {
      if (!normalizedEmail || !password) {
        addNotification("Please enter email and password.");
        return;
      }

      try {
        const userRef = doc(db, "users", normalizedEmail);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
          if (userData.password === password) {
            setCurrentUser(userData);
            setIsLoggedIn(true);
            setShowAuthModal(false);
            addNotification("Login Successful.");
          } else {
            addNotification("Incorrect Password.");
          }
        } else {
          addNotification("User not found. Please Sign Up.");
        }
      } catch (error) {
        console.error("Login Error:", error);
        addNotification("Login failed.");
      }
    }
  };
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationInput === systemOTP && tempUser) {
      if (authMode === 'signup') {
        setVerifiedUsers(prev => [...prev, tempUser]);
      }
      setIsLoggedIn(true);
      setCurrentUser(tempUser);
      setShowAuthModal(false);
      setAuthStep('persona');
      setTempUser(null);
      setVerificationInput('');
      addNotification(`Authorized: Welcome, ${tempUser.firstName}`);
    } else {
      addNotification("Handshake Failed: Invalid Verification Code.");
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    let updatedAddresses = [...currentUser.addresses];
    if (editingAddress) {
      updatedAddresses = updatedAddresses.map(a => a.id === editingAddress.id ? { ...a, ...addressForm } as UserAddress : a);
      addNotification("Address updated.");
    } else {
      updatedAddresses.push({ ...addressForm as UserAddress, id: `addr-${Date.now()}` });
      addNotification("New address added.");
    }
    const updatedUser = { ...currentUser, addresses: updatedAddresses };
    setCurrentUser(updatedUser);
    setVerifiedUsers(prev => prev.map(u => u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u));
    setIsAddingAddress(false);
    setEditingAddress(null);
  };
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reviewTarget) return;

    // 1. Create the Review Object
    const newReview: UserReview = {
      id: `rev-${Date.now()}`,
      projectId: reviewTarget.id,
      projectName: reviewTarget.name,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      date: new Date().toLocaleDateString(),
      userName: `${currentUser.firstName} ${currentUser.lastName}`
    };

    // 2. Save to User Profile
    const updatedUser = {
      ...currentUser,
      reviews: [newReview, ...currentUser.reviews]
    };
    setCurrentUser(updatedUser);
    setVerifiedUsers(prev => prev.map(u => u.email === updatedUser.email ? updatedUser : u));

    // 3. Update Global Inventory Stats (Live Rating Calculation)
    setInventory(prev => prev.map(p => {
      if (p.id === reviewTarget.id) {
        const oldCount = p.reviewCount || 0;
        const oldRating = p.rating || 5;
        const newCount = oldCount + 1;
        // Calculate new weighted average
        const newRating = ((oldRating * oldCount) + reviewForm.rating) / newCount;
        
        return { ...p, rating: parseFloat(newRating.toFixed(1)), reviewCount: newCount };
      }
      return p;
    }));

    // 4. Cleanup
    setIsWritingReview(false);
    setReviewTarget(null);
    setReviewForm({ rating: 5, comment: '' });
    addNotification("Review published! Thank you for your feedback.");
  };

  const generateReference = (cat: string) => {
    const prefix = CATEGORY_PREFIXES[cat] || 'REF';
    const existingNums = inventory
      .filter(p => p.reference.startsWith(prefix + '-'))
      .map(p => {
        const parts = p.reference.split('-');
        return parseInt(parts[1], 10);
      })
      .filter(n => !isNaN(n));
    
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1000;
    return `${prefix}-${nextNum}`;
  };

const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name || !projectForm.price) return;

    try {
      if (editingProject) {
        // --- EDIT EXISTING (Cloud) ---
        const projectRef = doc(db, "inventory", editingProject.id);
        await setDoc(projectRef, projectForm, { merge: true });
        addNotification("Product updated in Cloud.");
      } else {
        // --- ADD NEW (Cloud) ---
        const newId = `proj-${Date.now()}`;
        const newProject = { ...projectForm, id: newId };
        await setDoc(doc(db, "inventory", newId), newProject);
        addNotification("New Product Live!");
      }
      setIsAddingProject(false);
      setEditingProject(null);
      // Reset Form
      setProjectForm({ 
         name: '', category: 'Arduino', price: 0, description: '', 
         image: '', rating: 5, reviewCount: 0, 
         features: [], type: 'physical' 
      });
    } catch (error) {
      console.error("Error saving:", error);
      addNotification("Failed to save product.");
    }
  };
const handleDeleteProject = async (projectId: string) => {
    // 1. Confirm before deleting (Safety)
    if (!window.confirm("Are you sure you want to delete this product from the Cloud?")) {
      return;
    }

    try {
      // 2. Delete the document from the 'inventory' collection
      await deleteDoc(doc(db, "inventory", projectId));
      addNotification("Product deleted permanently.");
      
      // Note: The real-time listener will automatically remove it from the screen
    } catch (error) {
      console.error("Error deleting product:", error);
      addNotification("Failed to delete product.");
    }
  };
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProjectForm(prev => ({ ...prev, image: reader.result as string }));
      addNotification("Image uploaded from device.");
    };
    reader.readAsDataURL(file);
  };

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      addNotification("File too large. Max 50MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProjectForm(prev => ({ ...prev, video: reader.result as string }));
      addNotification("Demo video attached successfully.");
    };
    reader.readAsDataURL(file);
  };

  const startCheckout = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    if (cart.length === 0) return;
    setCheckoutStep('info');
  };

const handleFinalizeOrder = async () => { // <--- Added 'async'
    if (!currentUser || !trxId.trim()) {
      addNotification("Please enter bKash Transaction ID.");
      return;
    }

    const shippingAddr = currentUser.addresses.find(a => a.id === selectedShippingId);
    const billingAddr = currentUser.addresses.find(a => a.id === selectedBillingId);

    const deliveryFee = 0;
    const finalTotal = cartTotal + deliveryFee; 

    const newOrder: Order = {
      id: tempOrderId,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      items: JSON.parse(JSON.stringify(cart)), 
      total: finalTotal,
      status: 'Confirmed',
      trxId: trxId.trim(),
      shippingAddress: shippingAddr,
      billingAddress: billingAddr,
      userEmail: currentUser.email,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      userPhone: currentUser.phone
    };

    // --- CLOUD SAVE (THE MISSING PART) ---
    try {
      const userRef = doc(db, "users", currentUser.email);
      
      // Send to Firebase Cloud
      await updateDoc(userRef, {
        orders: arrayUnion(newOrder)
      });

      // Clear local cart
      setCart([]);
      setCheckoutStep(null);
      setTrxId('');
      setTempOrderId('');
      addNotification("Order Sent to Admin Dashboard!");
      setCurrentTab(NavigationTab.ACCOUNT);
      setAccountSubView('orders');

    } catch (error) {
      console.error("Order Failed:", error);
      addNotification("Failed to place order. Check console.");
    }
  };

const updateOrderStatus = async (targetUserEmail: string, orderId: string, newStatus: OrderStatus) => {
    // 1. Safety Check: If it's the Admin's own test order (local), ignore Cloud
    if (targetUserEmail === 'admin@gmail.com') return;

    try {
      // 2. Find the User in the Cloud Database
      const userRef = doc(db, "users", targetUserEmail);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        
        // 3. Update the specific order in their personal list
        const updatedOrders = userData.orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        );

        // 4. Save the updated list back to the Cloud
        await updateDoc(userRef, { orders: updatedOrders });
        addNotification(`Order status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      addNotification("Failed to update status.");
    }
  };

const addToCart = (proj: Project, qty: number = 1, forceComplete: boolean = false) => {
    // 1. Intercept and show options modal if not forced
    if (!forceComplete) {
      setPendingAddition({ proj, qty });
      setShowCartOptionsModal(true);
      setOptionIEEE(false);
      setOptionPPTX(false);
      return;
    }

    // 2. Prepare the options object
    const selectedOptions = {
      ieee: optionIEEE,
      pptx: optionPPTX
    };

    const existing = cart.find(x => x.id === proj.id);
    
    if (existing) {
      // Note: In a complex app, items with different options should be separate rows. 
      // For now, we merge and update the options to the latest selection.
      setCart(cart.map(x => x.id === proj.id ? { 
        ...x, 
        quantity: x.quantity + qty,
        // Update options to the newest selection
        options: selectedOptions 
      } : x));
    } else {
      setCart([...cart, { 
        ...proj, 
        quantity: qty,
        // Save the options here
        options: selectedOptions 
      }]);
    }
    
    addNotification(`${proj.name} added to cart.`);
    setShowCartOptionsModal(false);
    setPendingAddition(null);
  };

  const getProjectReviews = (projectId: string) => {
    return verifiedUsers.reduce((acc, user) => {
      const projectReviews = (user.reviews || [])
        .filter(r => r.projectId === projectId)
        .map(r => ({ ...r, userName: `${user.firstName} ${user.lastName}` }));
      return [...acc, ...projectReviews];
    }, [] as UserReview[]);
  };

  const renderProjectDetails = () => {
    if (!selectedProject) return null;

    const isReduced = selectedProject.priceAdjustmentType === 'reduced' || (selectedProject.originalPrice && selectedProject.price < selectedProject.originalPrice);
    const reviews = getProjectReviews(selectedProject.id);
    
    return (
      <div className="max-w-7xl mx-auto px-8 py-12 animate-in fade-in slide-in-from-bottom-2">
        <button 
          onClick={() => { setCurrentTab(NavigationTab.HOME); setSelectedProject(null); setDetailQuantity(1); setActiveDetailTab(0); }}
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-black mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Inventory
        </button>

        <div className="flex flex-col lg:flex-row gap-12 mb-20">
          <div className="flex-1 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-8 relative overflow-hidden flex items-center justify-center min-h-[400px]">
              {isReduced && (
                <div className="absolute top-6 left-6 z-10">
                   <span className="bg-red-500 text-white text-[11px] font-black px-4 py-1.5 uppercase tracking-wider rounded-sm shadow-lg">Reduced price</span>
                </div>
              )}
              <img src={selectedProject.image} alt={selectedProject.name} className="max-h-[500px] object-contain mix-blend-multiply" />
            </div>
            <div className="flex gap-4">
               {[selectedProject.image, ...(selectedProject.thumbnails || [])].slice(0, 4).map((img, i) => (
                 <div key={i} className="w-24 h-24 border border-slate-200 rounded-xl p-2 cursor-pointer hover:border-[#FFB800] bg-white transition-all overflow-hidden flex items-center justify-center">
                    <img src={img} className="object-contain max-h-full" alt="Thumbnail" />
                 </div>
               ))}
               {selectedProject.video && (
                 <div className="w-24 h-24 border-2 border-[#FFB800] rounded-xl p-2 cursor-pointer bg-slate-900 flex flex-col items-center justify-center text-white gap-1 shadow-lg">
                    <svg className="w-6 h-6 text-[#FFB800]" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
                    <span className="text-[8px] font-black uppercase">Demo</span>
                 </div>
               )}
            </div>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-black text-slate-900 uppercase leading-tight tracking-tight">{selectedProject.name}</h1>
              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Reference: <span className="text-slate-900">{selectedProject.reference}</span></span>
                <span>Brand: <span className="text-slate-900">{selectedProject.brand || 'CircuitProjects'}</span></span>
              </div>
            </div>

            <div className="space-y-4">
              <ul className="space-y-2">
                {(selectedProject.features || selectedProject.specs || []).slice(0, 6).map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xl line-clamp-3">
                {selectedProject.description}
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-baseline gap-3">
                   {selectedProject.originalPrice && (
                     <span className="text-lg font-bold text-slate-300 line-through">BDT {selectedProject.originalPrice.toLocaleString()}</span>
                   )}
                   <span className="text-4xl font-black text-slate-900">BDT {selectedProject.price.toLocaleString()}</span>
                </div>
                {selectedProject.priceAdjustmentType === 'reduced' && selectedProject.priceAdjustmentAmount && (
                  <span className="bg-red-500 text-white px-3 py-1 text-[10px] font-black uppercase rounded shadow-lg shadow-red-100">
                    Save BDT {selectedProject.priceAdjustmentAmount.toLocaleString()}
                  </span>
                )}
              </div>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between mb-8">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase text-green-500 italic mb-2">Discount Ends In</span>
                   <div className="flex gap-4">
                      {[
                        { label: 'Days', val: timeLeft.days },
                        { label: 'Hours', val: timeLeft.hours },
                        { label: 'Minutes', val: timeLeft.minutes },
                        { label: 'Seconds', val: timeLeft.seconds }
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="bg-black text-white px-2 py-1 rounded text-lg font-black tracking-widest min-w-[40px] text-center">{item.val}</div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                            {item.label}
                          </span>
                        </div>
                      ))}
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="flex gap-1 text-[#FFB800] mb-1">
                     {[1,2,3,4,5].map(s => <svg key={s} className={`w-4 h-4 ${s <= selectedProject.rating ? 'fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                   </div>
                   <span onClick={() => setActiveDetailTab(2)} className="text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-black underline">Read the review</span>
                   <p className="text-[9px] font-bold text-slate-500 mt-1">Avg Rating: {selectedProject.rating}/5 • Reviews: {selectedProject.reviewCount || reviews.length}</p>
                 </div>
              </div>

              <div className="flex gap-4 items-center mb-10">
                 <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                      className="px-6 py-4 hover:bg-slate-100 transition-colors font-black text-slate-400 hover:text-black"
                    >－</button>
                    <input 
                      type="number" 
                      value={detailQuantity} 
                      onChange={(e) => setDetailQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-black text-sm outline-none bg-white border-x border-slate-100" 
                    />
                    <button 
                      onClick={() => setDetailQuantity(detailQuantity + 1)}
                      className="px-6 py-4 hover:bg-slate-100 transition-colors font-black text-slate-400 hover:text-black"
                    >＋</button>
                 </div>
                 <button 
                  onClick={() => addToCart(selectedProject, detailQuantity)}
                  className="flex-1 bg-[#8cc63f] hover:brightness-105 text-white py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-green-100 transition-all font-black uppercase text-xs tracking-widest active:scale-95"
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2.5"/></svg>
                    Add to Cart
                 </button>
              </div>

              <div className="space-y-2">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                    <span className="text-red-500">🔥 {selectedProject.purchasedRecently || 0} people</span> have purchased this recently
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                    <span className="text-orange-500">{selectedProject.addedToCartRecently || 0} people</span> added this item to cart in last 10 days
                 </div>
                 <div className="pt-4 flex flex-col gap-2">
                    <span className="text-[11px] font-black uppercase text-slate-800">
                      {selectedProject.stockCount || 13} items in stock in {selectedProject.stockLocation || 'Uttara, Dhaka'}
                    </span>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="bg-blue-50 h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20">
           <div className="flex border-b border-slate-200 gap-8 mb-10">
              {['DESCRIPTION', 'PRODUCT DETAILS', `COMMENTS (${reviews.length})`].map((tab, idx) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveDetailTab(idx)}
                  className={`pb-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${activeDetailTab === idx ? 'border-[#8cc63f] text-black' : 'border-transparent text-slate-400 hover:text-black'}`}
                >
                  {tab}
                </button>
              ))}
           </div>
           
           <div className="animate-in fade-in duration-500">
              {activeDetailTab === 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-white border border-slate-100 rounded-3xl p-10 space-y-6">
                       <h3 className="text-xl font-black uppercase tracking-tighter">Detailed Description:</h3>
                       <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {selectedProject.detailedDescription || selectedProject.description || "No extended description provided."}
                       </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-3xl p-10 space-y-6">
                       <h3 className="text-xl font-black uppercase tracking-tighter">Features:</h3>
                       <ol className="space-y-4">
                          {(selectedProject.features || []).length > 0 ? selectedProject.features?.map((f, i) => (
                            <li key={i} className="text-sm text-slate-600 flex gap-3">
                               <span className="font-black text-black">{i + 1}.</span>
                               {f}
                            </li>
                          )) : (
                            <p className="text-sm text-slate-400">Standard feature documentation is currently being finalized.</p>
                          )}
                       </ol>
                    </div>
                 </div>
              )}

              {activeDetailTab === 1 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-3xl p-1 shadow-sm overflow-hidden">
                       <table className="w-full text-xs">
                          <thead>
                             <tr className="bg-[#8cc63f] text-white">
                                <th colSpan={2} className="py-3 px-6 text-center font-black uppercase tracking-widest">General Specifications</th>
                             </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                             {Object.entries(selectedProject.detailedSpecs || {
                               'Item Type': selectedProject.category,
                               'Model': selectedProject.name,
                               'Reference': selectedProject.reference
                             }).map(([key, val], i) => (
                               <tr key={i} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4 px-6 font-black text-slate-900 w-1/3 bg-slate-50 uppercase tracking-tighter border-r border-slate-100">{key}:</td>
                                  <td className="py-4 px-6 font-bold text-slate-600 uppercase">{val}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-3xl p-10 space-y-6">
                       <h3 className="text-xl font-black uppercase tracking-tighter">Package Includes:</h3>
                       <ul className="space-y-3">
                          {(selectedProject.packageIncludes || [
                            `1 x ${selectedProject.name}`,
                            'Quick Start and Support Guide'
                          ]).map((item, i) => (
                            <li key={i} className="text-sm text-slate-600 flex gap-3">
                               <span className="text-slate-400 font-bold">✓</span>
                               {item}
                            </li>
                          ))}
                       </ul>
                    </div>
                 </div>
              )}

              {activeDetailTab === 2 && (
                 <div className="bg-white border border-slate-100 rounded-3xl p-10 space-y-8">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Customer Discussions:</h3>
                    {reviews.length === 0 ? (
                       <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-2xl">
                          No logged feedback for this kit yet.
                       </div>
                    ) : (
                       <div className="space-y-6">
                          {reviews.map((r) => (
                             <div key={r.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center font-black text-slate-400">{r.userName?.charAt(0)}</div>
                                      <div>
                                         <p className="text-xs font-black uppercase">{r.userName}</p>
                                         <p className="text-[10px] text-slate-400 font-bold">{r.date}</p>
                                      </div>
                                   </div>
                                   <div className="flex gap-0.5 text-[#FFB800]">
                                      {[1,2,3,4,5].map(s => <svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
                                   </div>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed italic">"{r.comment}"</p>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  };
  const renderReviewsManager = () => {
    // Logic: Find all items purchased -> Filter out ones already reviewed
    const allPurchasedItems = currentUser?.orders.flatMap(o => o.items) || [];
    // Remove duplicates (if bought same item twice)
    const uniquePurchased = Array.from(new Map(allPurchasedItems.map(item => [item.id, item])).values());
    const reviewedIds = new Set(currentUser?.reviews.map(r => r.projectId));
    
    const pendingReviews = uniquePurchased.filter(p => !reviewedIds.has(p.id));

    return (
      <div className="max-w-5xl mx-auto py-12 px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-12">
           <button onClick={() => setAccountSubView('menu')} className="text-slate-400 hover:text-black">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
           </button>
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">My Reviews</h1>
        </div>

        {/* SECTION 1: PENDING REVIEWS */}
        <div className="mb-16">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Waiting for Feedback ({pendingReviews.length})</h3>
          
          {pendingReviews.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
               <p className="text-xs font-black text-slate-400 uppercase">You have reviewed all your purchases.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingReviews.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-6 hover:shadow-lg transition-all group">
                   <img src={item.image} alt={item.name} className="w-20 h-20 object-contain mix-blend-multiply" />
                   <div className="flex-1">
                      <h4 className="text-sm font-black text-slate-900 uppercase mb-1">{item.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">{item.category}</p>
                      <button 
                        onClick={() => { setReviewTarget(item); setIsWritingReview(true); }}
                        className="bg-black text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-colors"
                      >
                        Rate Product
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: PAST REVIEWS */}
        <div>
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">History</h3>
           <div className="space-y-4">
             {currentUser?.reviews.length === 0 ? (
                <p className="text-xs font-bold text-slate-300 uppercase">No reviews history found.</p>
             ) : (
                currentUser?.reviews.map(r => (
                  <div key={r.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">{r.projectName}</span>
                        <span className="text-[10px] font-bold text-slate-400">{r.date}</span>
                     </div>
                     <div className="flex gap-1 text-[#FFB800] mb-3">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-current' : 'text-slate-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                     </div>
                     <p className="text-xs text-slate-600 italic">"{r.comment}"</p>
                  </div>
                ))
             )}
           </div>
        </div>

        {/* --- MODAL FOR WRITING REVIEW --- */}
        {isWritingReview && reviewTarget && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
             <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden animate-in zoom-in-95 shadow-2xl">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                   <div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reviewing</span>
                     <h3 className="text-sm font-black text-slate-900 uppercase">{reviewTarget.name}</h3>
                   </div>
                   <button onClick={() => setIsWritingReview(false)} className="text-slate-400 hover:text-red-500 font-black">✕</button>
                </div>
                
                <form onSubmit={handleSubmitReview} className="p-8 space-y-6">
                   {/* Star Rating Input */}
                   <div className="text-center">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Rate Satisfaction</span>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                          >
                            <svg 
                              className={`w-10 h-10 ${star <= reviewForm.rating ? 'text-[#FFB800] fill-current' : 'text-slate-200'}`} 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" strokeWidth="1" stroke="currentColor"/>
                            </svg>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-2 uppercase">
                        {reviewForm.rating === 5 ? "Excellent!" : reviewForm.rating === 1 ? "Poor" : `${reviewForm.rating} Stars`}
                      </p>
                   </div>

                   {/* Comment Input */}
                   <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Public Comment</span>
                      <textarea 
                        required
                        rows={4}
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-[#FFB800] rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none resize-none placeholder:text-slate-300"
                        placeholder="Share your experience with this kit..."
                      />
                   </div>

                   <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#FFB800] hover:text-black transition-all shadow-xl">
                      Submit Review
                   </button>
                </form>
             </div>
          </div>
        )}
      </div>
    );
  };
  const renderReceipt = () => {
    if (!viewingReceipt) return null;

    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white w-full max-w-xl rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
          
          {/* --- RECEIPT HEADER --- */}
          <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
            <div>
              <div className="scale-75 origin-top-left mb-2">{LOGO_SVG}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Payment Receipt</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black uppercase tracking-widest">Paid</h2>
              <p className="text-xs font-mono text-slate-400 mt-1">#{viewingReceipt.id}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{viewingReceipt.date}</p>
            </div>
          </div>

          {/* --- SCROLLABLE CONTENT --- */}
          <div className="p-8 overflow-y-auto hide-scrollbar space-y-8">
            
            {/* Customer & Shipping Info */}
            <div className="grid grid-cols-2 gap-8 pb-8 border-b border-slate-100">
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</span>
                <p className="text-xs font-bold text-slate-900 uppercase">{viewingReceipt.userName}</p>
                <p className="text-xs text-slate-500">{viewingReceipt.userPhone}</p>
                <p className="text-xs text-slate-500">{viewingReceipt.userEmail}</p>
              </div>
              <div className="text-right">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Shipped To</span>
                {viewingReceipt.shippingAddress ? (
                  <>
                    <p className="text-xs font-bold text-slate-900 uppercase">{viewingReceipt.shippingAddress.street}</p>
                    <p className="text-xs text-slate-500 uppercase">{viewingReceipt.shippingAddress.city}, {viewingReceipt.shippingAddress.zip}</p>
                    <p className="text-xs text-slate-500 uppercase">{viewingReceipt.shippingAddress.country}</p>
                  </>
                ) : <p className="text-xs text-slate-400 italic">Digital Delivery</p>}
              </div>
            </div>

            {/* Line Items */}
            <div>
              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Itemized Purchase List</span>
              <div className="space-y-3">
                {viewingReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs border-b border-dashed border-slate-100 pb-3 last:border-0">
                    <div>
                      <span className="font-bold text-slate-900 uppercase">
                        {idx + 1}. {item.name} <span className="text-slate-400">x{item.quantity}</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase">{item.category}</p>
                      
                      {/* Badge for IEEE / PPTX */}
                      {(item.options?.ieee || item.options?.pptx) && (
                        <div className="flex gap-2 mt-1.5">
                          {item.options.ieee && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">IEEE Report</span>}
                          {item.options.pptx && <span className="text-[8px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">PPTX Slides</span>}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-slate-900">BDT {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-6 rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-500 uppercase">Subtotal</span>
                <span className="font-bold text-slate-900">BDT {viewingReceipt.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-500 uppercase">Delivery Fees</span>
                <span className="font-black text-green-600 uppercase">Free</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-slate-200 mt-2">
                <span className="font-black text-slate-900 uppercase">Total Paid</span>
                <span className="font-black text-slate-900">BDT {viewingReceipt.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border border-slate-100 rounded-xl p-4 flex items-center gap-4">
               <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center text-pink-600">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>
               </div>
               <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Method</p>
                 <p className="text-xs font-bold text-slate-900 uppercase">bKash Mobile Money</p>
                 <p className="text-[10px] font-mono text-slate-500 mt-0.5">TRX ID: {viewingReceipt.trxId}</p>
               </div>
            </div>

          </div>

          {/* --- FOOTER / ACTIONS --- */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
             <button onClick={() => window.print()} className="flex-1 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 hover:text-slate-900 transition-all text-slate-400">
               Print / Save PDF
             </button>
             <button onClick={() => setViewingReceipt(null)} className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all">
               Close Receipt
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInformation = () => (
    <div className="bg-white border border-slate-100 p-10 rounded-[32px] shadow-sm max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => setAccountSubView('menu')} className="text-slate-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Personal Information</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { label: 'First Name', value: currentUser?.firstName },
          { label: 'Last Name', value: currentUser?.lastName },
          { label: 'Email Address', value: currentUser?.email },
          { label: 'Phone Number', value: currentUser?.phone || 'Not Provided' },
          { label: 'Account Role', value: currentUser?.role.toUpperCase() },
          { label: 'Status', value: 'Verified' }
        ].map((info, i) => (
          <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{info.label}</span>
            <span className="text-sm font-black text-slate-900 uppercase">{info.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAddressesManager = () => (
    <div className="bg-white border border-slate-100 p-10 rounded-[32px] shadow-sm max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setAccountSubView('menu')} className="text-slate-400 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Addresses</h1>
        </div>
        <button 
          onClick={() => { 
            setIsAddingAddress(true); 
            setEditingAddress(null); 
            setAddressForm({ type: 'Home', street: '', city: '', zip: '', country: 'Bangladesh' }); 
          }} 
          className="bg-black text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black rounded-2xl transition-all"
        >
          + Add New Address
        </button>
      </div>

      {(isAddingAddress || editingAddress) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 p-10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{editingAddress ? 'Modify Address' : 'New Address'}</h3>
              <button onClick={() => { setIsAddingAddress(false); setEditingAddress(null); }} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSaveAddress} className="space-y-6">
              <div className="relative" ref={addressDropdownRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Address Type</label>
                <button 
                  type="button"
                  onClick={() => setIsAddressTypeDropdownOpen(!isAddressTypeDropdownOpen)}
                  className="w-full px-5 py-4 bg-slate-50 rounded-xl text-left font-bold border-2 border-transparent focus:border-[#FFB800] flex justify-between items-center"
                >
                  {addressForm.type}
                  <svg className={`w-4 h-4 transition-transform ${isAddressTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {isAddressTypeDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden">
                    {['Home', 'Billing', 'Shipping'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setAddressForm({ ...addressForm, type: type as any }); setIsAddressTypeDropdownOpen(false); }}
                        className="w-full px-5 py-4 text-left text-xs font-black uppercase hover:bg-slate-50 transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Street Address</label>
                <input required type="text" value={addressForm.street || ''} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">City</label>
                  <input required type="text" value={addressForm.city || ''} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">ZIP / Postcode</label>
                  <input required type="text" value={addressForm.zip || ''} onChange={e => setAddressForm({...addressForm, zip: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                </div>
              </div>

              <button type="submit" className="w-full bg-black text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all shadow-lg">
                {editingAddress ? 'Update Logistics' : 'Save Coordinates'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {currentUser?.addresses.map(addr => (
          <div key={addr.id} className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-[#FFB800] transition-colors group relative">
            <span className="block text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">{addr.type} Target</span>
            <p className="text-sm font-black text-slate-900 uppercase mb-1">{addr.street}</p>
            <p className="text-xs font-bold text-slate-400 uppercase">{addr.city}, {addr.zip}</p>
            <p className="text-xs font-bold text-slate-400 uppercase mb-6">{addr.country}</p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => { setEditingAddress(addr); setAddressForm(addr); }} 
                className="text-[10px] font-black text-slate-900 uppercase underline hover:text-[#FFB800] transition-colors"
              >
                Modify
              </button>
              <button 
                onClick={() => {
                  if(confirm("Delete address?")) {
                    const updatedAddresses = currentUser.addresses.filter(a => a.id !== addr.id);
                    const updatedUser = { ...currentUser, addresses: updatedAddresses };
                    setCurrentUser(updatedUser);
                    setVerifiedUsers(prev => prev.map(u => u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u));
                    addNotification("Address removed.");
                  }
                }} 
                className="text-[10px] font-black text-red-500 uppercase underline hover:text-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {(!currentUser?.addresses || currentUser.addresses.length === 0) && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
             <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No logistics targets defined</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderInventoryManager = () => (
    <div className="bg-white border border-slate-100 p-10 rounded-[32px] shadow-sm max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setAccountSubView('menu')} className="text-slate-400 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Lab Inventory</h1>
        </div>
        <button 
          onClick={() => { 
            setIsAddingProject(true); 
            setEditingProject(null); 
            setProjectForm({ 
              name: '', price: 0, reference: '', category: SIDEBAR_CATEGORIES[0], 
              inStock: true, rating: 5, reviewCount: 0, image: '', video: '', 
              description: '', detailedDescription: '', specs: [], features: [],
              packageIncludes: [],
              detailedSpecs: {},
              purchasedRecently: 0, addedToCartRecently: 0,
              priceAdjustmentType: 'none', priceAdjustmentAmount: 0 
            }); 
          }} 
          className="bg-black text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black rounded-2xl transition-all"
        >
          + Add New Blueprint
        </button>
      </div>

      {(isAddingProject || editingProject) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 p-8 flex justify-between items-center border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{editingProject ? 'Modify Blueprint' : 'New Blueprint'}</h3>
              <button onClick={() => { setIsAddingProject(false); setEditingProject(null); }} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSaveProject} className="p-10 space-y-6 overflow-y-auto hide-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Blueprint Name</label>
                  <input required type="text" value={projectForm.name || ''} onChange={e => setProjectForm({...projectForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Category Sector</label>
                  <select 
                    value={projectForm.category || SIDEBAR_CATEGORIES[0]} 
                    onChange={e => {
                      const newCat = e.target.value;
                      setProjectForm({...projectForm, category: newCat});
                    }} 
                    className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold appearance-none cursor-pointer border-2 border-transparent focus:border-[#FFB800]"
                  >
                    {SIDEBAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Price (BDT)</label>
                  <input required type="number" value={projectForm.price || 0} onChange={e => setProjectForm({...projectForm, price: Number(e.target.value)})} className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Reference Code</label>
                  <div className="flex gap-2">
                    <input 
                      required 
                      type="text" 
                      value={projectForm.reference || ''} 
                      onChange={e => setProjectForm({...projectForm, reference: e.target.value})} 
                      className="flex-1 px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setProjectForm({ ...projectForm, reference: generateReference(projectForm.category || SIDEBAR_CATEGORIES[0]) })}
                      className="bg-[#FFB800] text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shrink-0"
                    >
                      Gen
                    </button>
                  </div>
                </div>
              </div>

              {/* Descriptions & Marketing Fields */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                <span className="block text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">Product Content & Live Statistics</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Short Description</label>
                      <textarea rows={2} value={projectForm.description || ''} onChange={e => setProjectForm({...projectForm, description: e.target.value})} className="w-full px-5 py-4 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] resize-none" placeholder="One-line summary..." />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Detailed Product Story</label>
                      <textarea rows={2} value={projectForm.detailedDescription || ''} onChange={e => setProjectForm({...projectForm, detailedDescription: e.target.value})} className="w-full px-5 py-4 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] resize-none" placeholder="Detailed engineering overview..." />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Features List (One per line)</label>
                      <textarea rows={4} value={Array.isArray(projectForm.features) ? projectForm.features.join('\n') : (projectForm.features || '')} onChange={e => setProjectForm({...projectForm, features: e.target.value as any})} className="w-full px-5 py-4 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] resize-none" placeholder="Feature A&#10;Feature B..." />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Package Contents (One per line)</label>
                      <textarea rows={4} value={Array.isArray(projectForm.packageIncludes) ? projectForm.packageIncludes.join('\n') : (projectForm.packageIncludes || '')} onChange={e => setProjectForm({...projectForm, packageIncludes: e.target.value as any})} className="w-full px-5 py-4 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] resize-none" placeholder="1 x Controller&#10;2 x Cables..." />
                   </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['CPU', 'RAM', 'Power', 'Weight'].map(specKey => (
                    <div key={specKey}>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">{specKey}</label>
                      <input 
                        type="text" 
                        value={projectForm.detailedSpecs?.[specKey] || ''} 
                        onChange={e => setProjectForm({...projectForm, detailedSpecs: {...(projectForm.detailedSpecs || {}), [specKey]: e.target.value}})}
                        className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                        placeholder="N/A"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Recent Purchases</label>
                    <input type="number" value={projectForm.purchasedRecently || 0} onChange={e => setProjectForm({...projectForm, purchasedRecently: Number(e.target.value)})} className="w-full px-5 py-4 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cart Deployment Logs (10 Days)</label>
                    <input type="number" value={projectForm.addedToCartRecently || 0} onChange={e => setProjectForm({...projectForm, addedToCartRecently: Number(e.target.value)})} className="w-full px-5 py-4 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Adjustment (Optional)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Type</label>
                    <select 
                      value={projectForm.priceAdjustmentType || 'none'} 
                      onChange={e => setProjectForm({...projectForm, priceAdjustmentType: e.target.value as any})}
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold appearance-none cursor-pointer border-2 border-transparent focus:border-[#FFB800]"
                    >
                      <option value="none">Normal Price</option>
                      <option value="reduced">Reduced Price</option>
                      <option value="increased">Increased Price</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Amount (BDT)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={projectForm.priceAdjustmentAmount || 0} 
                      onChange={e => setProjectForm({...projectForm, priceAdjustmentAmount: Number(e.target.value)})} 
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Review Curation (Optional)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Rating (1-5)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="5" 
                      step="0.1"
                      placeholder="5"
                      value={projectForm.rating ?? 5} 
                      onChange={e => setProjectForm({...projectForm, rating: Number(e.target.value)})} 
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Total Reviewers</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={projectForm.reviewCount ?? 0} 
                      onChange={e => setProjectForm({...projectForm, reviewCount: Number(e.target.value)})} 
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Image Source URL</label>
                <div className="flex gap-2">
                  <input 
                    required={!projectForm.image} 
                    type="text" 
                    placeholder="https://..."
                    value={projectForm.image || ''} 
                    onChange={e => setProjectForm({...projectForm, image: e.target.value})} 
                    className="flex-1 px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                  />
                  <label className="bg-slate-900 text-white p-4 rounded-xl cursor-pointer hover:bg-black transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLocalImageUpload}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Project Demo Video URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://youtube.com/embed/.. or mp4 link"
                    value={projectForm.video || ''} 
                    onChange={e => setProjectForm({...projectForm, video: e.target.value})} 
                    className="flex-1 px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" 
                  />
                  <label className="bg-[#FFB800] text-black p-4 rounded-xl cursor-pointer hover:brightness-110 transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={handleLocalVideoUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-8 py-2">
                <div className="flex items-center gap-3">
                  <input type="radio" id="inStock" name="stockStatus" checked={projectForm.inStock === true} onChange={() => setProjectForm({...projectForm, inStock: true})} className="w-5 h-5 accent-[#FFB800]" />
                  <label htmlFor="inStock" className="text-[10px] font-black text-slate-900 uppercase tracking-widest cursor-pointer">In Stock</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="radio" id="outOfStock" name="stockStatus" checked={projectForm.inStock === false} onChange={() => setProjectForm({...projectForm, inStock: false})} className="w-5 h-5 accent-red-500" />
                  <label htmlFor="outOfStock" className="text-[10px] font-black text-slate-900 uppercase tracking-widest cursor-pointer">Out of Stock</label>
                </div>
              </div>

              <button type="submit" className="w-full bg-black text-white py-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all shadow-lg">
                {editingProject ? 'Apply Database Update' : 'Initialize New Blueprint'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mt-10">
        {inventory.map(p => (
          <div key={p.id} className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-[#FFB800] transition-colors group">
            <div className="relative">
              <img src={p.image} alt={p.name} className="w-16 h-16 object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.reference} • {p.category}</p>
              <h4 className="text-sm font-black text-slate-900 uppercase">{p.name}</h4>
              <p className="text-sm font-black text-green-600">
                BDT {p.price.toLocaleString()}
                <span className="ml-3 text-[10px] text-slate-400 uppercase">
                  📊 {p.purchasedRecently} sold / {p.addedToCartRecently} in carts
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { 
                  setEditingProject(p); 
                  setProjectForm({
                    ...p,
                    features: p.features || [],
                    packageIncludes: p.packageIncludes || [],
                    detailedSpecs: p.detailedSpecs || {}
                  }); 
                  setIsAddingProject(true); 
                }} 
                className="px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#FFB800] transition-colors"
              >
                Edit
              </button>
<button 
  onClick={() => handleDeleteProject(p.id)} 
  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
  title="Delete Product"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfirmedOrdersManager = () => {
    const allOrders = verifiedUsers.reduce((acc, user) => {
      const userOrders = (user.orders || []).map(o => ({ 
        ...o, 
        userEmail: user.email, 
        userName: `${user.firstName} ${user.lastName}`,
        userPhone: user.phone
      }));
      return [...acc, ...userOrders];
    }, [] as Order[]);

    return (
      <div className="bg-white border border-slate-100 p-10 rounded-[32px] shadow-sm max-w-[98%] mx-auto overflow-hidden">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => setAccountSubView('menu')} className="text-slate-400 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Global Confirmed Orders</h1>
        </div>
        
        {viewingItemsOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
               <div className="bg-slate-50 p-8 flex justify-between items-center border-b border-slate-100 shrink-0">
                 <div>
                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">User Product List</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order Ref: {viewingItemsOrder.id}</p>
                 </div>
                 <button onClick={() => setViewingItemsOrder(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-black transition-colors shadow-sm">✕</button>
               </div>
               <div className="p-8 overflow-y-auto hide-scrollbar">
                 <div className="space-y-4">
{viewingItemsOrder.items.map((item, idx) => (
  <div key={idx} className="flex items-center gap-6 p-5 bg-slate-50 rounded-[28px] border border-slate-100 hover:border-[#FFB800] transition-colors group">
    <img src={item.image} className="w-20 h-20 object-contain mix-blend-multiply bg-white rounded-2xl p-2 border border-slate-100 group-hover:scale-105 transition-transform" />
    <div className="flex-1">
      <h4 className="text-sm font-black text-slate-900 uppercase">{item.name}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.category} • {item.reference}</p>
      
      {/* --- NEW CODE: DOCUMENTATION BADGES --- */}
      {(item.options?.ieee || item.options?.pptx) && (
        <div className="flex gap-2 mt-3">
          {item.options.ieee && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-200 flex items-center gap-1">
              📄 IEEE Report
            </span>
          )}
          {item.options.pptx && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border border-orange-200 flex items-center gap-1">
              📊 PPTX Slide
            </span>
          )}
        </div>
      )}
      {/* -------------------------------------- */}

    </div>
    <div className="text-right">
      <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1">Quantity</p>
      <p className="text-lg font-black text-slate-900">x{item.quantity}</p>
      <p className="text-[10px] font-black text-green-600 uppercase mt-1">BDT {(item.price * item.quantity).toLocaleString()}</p>
    </div>
  </div>
))}
                 </div>
               </div>
               <div className="p-10 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmed Paid Value</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">BDT {viewingItemsOrder.total.toLocaleString()}</span>
                  </div>
                  <button onClick={() => setViewingItemsOrder(null)} className="bg-black text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all">Close Dashboard</button>
               </div>
             </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-[32px] border border-slate-100">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Order ID</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Payment Price</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">bKash Paid</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">TrxID</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Reference</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Customer Number</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Customer Name</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Delivery Address</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Product List</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Status</th>
                <th className="px-6 py-5 border-b border-slate-800 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No order logs available in centralized database</p>
                    </div>
                  </td>
                </tr>
              ) : (
                allOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-black text-slate-900">{order.id}</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-bold text-slate-600">BDT {order.total.toLocaleString()}</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-black text-green-600 italic">BDT {order.total.toLocaleString()} (Paid)</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-black text-pink-600 tracking-wider font-mono">{order.trxId}</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-bold text-slate-400">{order.id}</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-black text-slate-700">{order.userPhone || 'N/A'}</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-bold text-slate-800 uppercase">{order.userName}</td>
                    <td className="px-6 py-5 border-b border-slate-100 text-xs font-bold text-slate-600">
                      {order.shippingAddress ? (
                        <div className="max-w-[220px] leading-relaxed lowercase">
                          <p className="font-black text-slate-900 uppercase truncate">{order.shippingAddress.street}</p>
                          <p className="truncate">{order.shippingAddress.city}, {order.shippingAddress.zip}</p>
                          <p className="text-[9px] opacity-60 uppercase">{order.shippingAddress.country}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">Not Selected</span>
                      )}
                    </td>
                    <td className="px-6 py-5 border-b border-slate-100">
                      <button 
                        onClick={() => setViewingItemsOrder(order)}
                        className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#FFB800] transition-all flex items-center gap-2 group/tab"
                      >
                        <svg className="w-3 h-3 opacity-40 group-hover/tab:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7" strokeWidth="3" strokeLinecap="round"/></svg>
                        View Items
                      </button>
                    </td>
                    <td className="px-6 py-5 border-b border-slate-100">
                      <div className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        order.status === 'Confirmed' ? 'bg-blue-100 text-blue-600' :
                        order.status === 'Shipped' ? 'bg-orange-100 text-orange-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {order.status}
                      </div>
                    </td>
                    <td className="px-6 py-5 border-b border-slate-100">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateOrderStatus(order.userEmail!, order.id, 'Shipped')}
                          title="Set as Shipped"
                          className="p-2.5 bg-white border border-slate-200 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button 
                          onClick={() => updateOrderStatus(order.userEmail!, order.id, 'Delivered')}
                          title="Set as Delivered"
                          className="p-2.5 bg-white border border-slate-200 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

const renderCheckoutFlow = () => {
    if (!checkoutStep) return null;

    return (
      <div className="max-w-4xl mx-auto py-12 px-8">
        {/* PROGRESS BAR */}
        <div className="flex items-center justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10" />
          {[
            { id: 'info', label: '1. User Info' },
            { id: 'address', label: '2. Destination' },
            { id: 'payment', label: '3. bKash Payment' }
          ].map(s => (
            <div key={s.id} className="bg-[#f8fafc] px-4">
              <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${checkoutStep === s.id ? 'bg-[#FFB800] border-[#FFB800] text-black' : 'bg-white border-slate-200 text-slate-400'}`}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* STEP 1: USER INFO */}
        {checkoutStep === 'info' && (
          <div className="bg-white p-12 rounded-[40px] shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-10 text-slate-900 text-center">Review Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <span className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Full Name</span>
                <p className="text-sm font-black text-slate-900 uppercase">{currentUser?.firstName} {currentUser?.lastName}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <span className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Email Access</span>
                <p className="text-sm font-black text-slate-900">{currentUser?.email}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 md:col-span-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Phone Link</span>
                <p className="text-sm font-black text-slate-900">{currentUser?.phone}</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => setCheckoutStep(null)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Abort Checkout</button>
              <button onClick={() => setCheckoutStep('address')} className="flex-1 py-5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all">Continue to Addresses</button>
            </div>
          </div>
        )}

        {/* STEP 2: ADDRESS */}
        {checkoutStep === 'address' && (
          <div className="bg-white p-12 rounded-[40px] shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-4 text-slate-900 text-center">
              Delivery Point
            </h2>
            <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">
              Select where to ship your kit
            </p>

            {/* --- INLINE ADD ADDRESS FORM --- */}
            {isAddingAddress ? (
              <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 mb-8 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest">New Delivery Location</h3>
                  <button onClick={() => setIsAddingAddress(false)} className="text-slate-400 hover:text-red-500 font-bold">Cancel</button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!currentUser) return;
                  
                  // 1. Generate ID and New Address Object
                  const newId = `addr-${Date.now()}`;
                  const newAddress = { ...addressForm, id: newId } as UserAddress;
                  
                  // 2. Update User Data Manually (Replicating handleSaveAddress logic)
                  const updatedAddresses = [...currentUser.addresses, newAddress];
                  const updatedUser = { ...currentUser, addresses: updatedAddresses };
                  
                  setCurrentUser(updatedUser);
                  setVerifiedUsers(prev => prev.map(u => u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u));
                  
                  // 3. AUTO-SELECT THE NEW ADDRESS (Fixes the "Proceed" button issue)
                  setSelectedShippingId(newId);
                  setSelectedBillingId(newId);
                  
                  // 4. Close Form
                  setIsAddingAddress(false);
                  addNotification("Address Saved & Selected");
                }} className="space-y-4">
                
                   {/* LABEL FIELD */}
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Label</label>
                      <select 
                        value={addressForm.type} 
                        onChange={e => setAddressForm({...addressForm, type: e.target.value as any})}
                        style={{ color: 'white', backgroundColor: '#0f172a' }} // Force colors
                        className="w-full px-4 py-3 rounded-xl border border-slate-700 font-bold text-sm focus:border-[#FFB800] outline-none"
                      >
                        <option value="Home">Home</option>
                        <option value="Billing">Office</option>
                        <option value="Shipping">Dormitory</option>
                      </select>
                   </div>

                   {/* STREET & CITY */}
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Street</label>
                        <input 
                          required 
                          placeholder="House/Road No." 
                          value={addressForm.street} 
                          onChange={e => setAddressForm({...addressForm, street: e.target.value})} 
                          style={{ color: '#ffffff' }} // FORCED WHITE TEXT
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 font-bold text-sm focus:border-[#FFB800] outline-none placeholder:text-slate-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">City</label>
                        <input 
                          required 
                          placeholder="Dhaka, etc." 
                          value={addressForm.city} 
                          onChange={e => setAddressForm({...addressForm, city: e.target.value})} 
                          style={{ color: '#ffffff' }} // FORCED WHITE TEXT
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 font-bold text-sm focus:border-[#FFB800] outline-none placeholder:text-slate-500" 
                        />
                      </div>
                   </div>

                   {/* ZIP & COUNTRY */}
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">ZIP Code</label>
                        <input 
                          required 
                          placeholder="1230" 
                          value={addressForm.zip} 
                          onChange={e => setAddressForm({...addressForm, zip: e.target.value})} 
                          style={{ color: '#ffffff' }} // FORCED WHITE TEXT
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 font-bold text-sm focus:border-[#FFB800] outline-none placeholder:text-slate-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Country</label>
                        <input 
                          readOnly 
                          value="Bangladesh" 
                          style={{ color: '#94a3b8' }} 
                          className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 font-bold text-sm outline-none" 
                        />
                      </div>
                   </div>
                   <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#8cc63f] hover:text-black transition-all">Save & Use This Address</button>
                </form>
              </div>
            ) : (
              /* --- ADDRESS LIST --- */
              <div className="space-y-4 mb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser?.addresses.map(addr => (
                    <button 
                      key={addr.id} 
                      onClick={() => {
                        setSelectedShippingId(addr.id);
                        setSelectedBillingId(addr.id);
                      }}
                      className={`p-6 rounded-3xl border-2 text-left transition-all relative group 
                        ${selectedShippingId === addr.id 
                          ? 'bg-black border-[#FFB800] shadow-xl' 
                          : 'bg-slate-900 border-transparent hover:border-slate-700'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${selectedShippingId === addr.id ? 'text-[#FFB800]' : 'text-slate-400'}`}>
                          {addr.type}
                        </span>
                        
                        {selectedShippingId === addr.id && (
                          <div className="w-4 h-4 bg-[#FFB800] rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>

                      {/* WHITE TEXT FOR ADDRESS DETAILS */}
                      <p className="text-xs font-black text-white uppercase truncate mb-1">
                        {addr.street}
                      </p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase">
                        {addr.city}, {addr.zip}
                      </p>
                    </button>
                  ))}
                  
                  {/* ADD NEW BUTTON */}
                  <button 
                    onClick={() => {
                      setIsAddingAddress(true);
                      setEditingAddress(null);
                      setAddressForm({ type: 'Home', street: '', city: '', zip: '', country: 'Bangladesh' });
                    }}
                    className="p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xl font-black">+</div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Add New Address</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={() => setCheckoutStep('info')} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button 
                onClick={() => {
                  if (!selectedShippingId) {
                    addNotification("Please select a delivery address.");
                    return;
                  }
                  if (!selectedBillingId) setSelectedBillingId(selectedShippingId);
                  
                  setTempOrderId(`CP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
                  setCheckoutStep('payment');
                }} 
                // BUTTON ACTIVATION LOGIC
                className={`flex-1 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${selectedShippingId ? 'bg-black text-white hover:bg-[#FFB800] hover:text-black cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {checkoutStep === 'payment' && (
          <div className="bg-white p-12 rounded-[40px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
            <div className="bg-[#D12053] text-white px-10 py-4 rounded-3xl font-black text-xl mb-12 shadow-xl shadow-pink-100">bKash Portal</div>
            
            <div className="w-full max-sm space-y-8">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-6">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">bKash Account (Personal)</span>
                  <p className="text-3xl font-black text-pink-600 tracking-wider">01601-582379</p>
                </div>
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm font-bold text-slate-900">BDT {cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Fee</span>
                    <span className="text-sm font-bold text-green-600 uppercase">Free</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Payable</span>
                    <p className="text-2xl font-black text-slate-900">BDT {cartTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-pink-50/50 p-8 rounded-[32px] border-2 border-dashed border-pink-200">
                <span className="block text-[10px] font-black text-pink-600 uppercase mb-3 tracking-widest text-center">CRITICAL: Payment Reference</span>
                <p className="text-center text-xs font-bold text-slate-700 leading-relaxed mb-4">
                  Please use the following unique identifier as the <span className="font-black">REFERENCE</span> during your bKash Send Money:
                </p>
                <div className="bg-white py-4 rounded-2xl shadow-inner text-center">
                  <span className="text-2xl font-black text-slate-900 tracking-[0.2em]">{tempOrderId}</span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Transaction ID (trxID)</label>
                <input 
                  type="text" 
                  placeholder="Paste TrxID here..." 
                  value={trxId}
                  onChange={e => setTrxId(e.target.value)}
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-pink-500 outline-none rounded-2xl font-black uppercase tracking-widest text-sm"
                />
              </div>

              <div className="pt-6 space-y-4">
                <button 
                  onClick={handleFinalizeOrder}
                  className="w-full bg-[#D12053] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest hover:brightness-110 shadow-2xl transition-all"
                >
                  Finalize Deployment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-['Inter']">
      <div className="fixed top-24 right-6 z-[300] flex flex-col gap-3">
        {notifications.map(n => <div key={n.id} className="bg-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10"><div className="w-2 h-2 bg-[#FFB800] rounded-full animate-pulse"></div><span className="text-xs font-black uppercase">{n.text}</span></div>)}
      </div>

      {showCartOptionsModal && pendingAddition && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 p-12 flex flex-col">
            <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tighter mb-8 border-b border-slate-100 pb-6">Blueprint Package Options</h3>
            
            <div className="space-y-6 mb-10">
              <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-[#8cc63f] cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={optionIEEE} 
                  onChange={(e) => setOptionIEEE(e.target.checked)}
                  className="w-6 h-6 accent-[#8cc63f]"
                />
                <div>
                  <p className="text-sm font-black uppercase text-slate-900">Include IEEE Standard Report</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Standardized technical documentation for submission.</p>
                </div>
              </label>

              <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-[#8cc63f] cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={optionPPTX} 
                  onChange={(e) => setOptionPPTX(e.target.checked)}
                  className="w-6 h-6 accent-[#8cc63f]"
                />
                <div>
                  <p className="text-sm font-black uppercase text-slate-900">Include Presentation PPTX File</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Curated slide deck for professional walkthroughs.</p>
                </div>
              </label>
            </div>

            {(optionIEEE || optionPPTX) && (
              <div className="mb-10 p-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl animate-in fade-in slide-in-from-left-4">
                 <p className="text-xs font-black uppercase text-blue-900 mb-1">Retrieval Protocol:</p>
                 <p className="text-xs font-bold text-blue-700 leading-relaxed uppercase">
                   Provide order ID in Whatsapp Number <span className="font-black text-blue-900">(01788582369)</span> to get file.
                 </p>
              </div>
            )}

            <div className="flex gap-4">
               <button 
                onClick={() => { setShowCartOptionsModal(false); setPendingAddition(null); }}
                className="flex-1 py-5 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
               >Cancel</button>
               <button 
                onClick={() => addToCart(pendingAddition.proj, pendingAddition.qty, true)}
                className="flex-[2] bg-black text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#8cc63f] transition-all shadow-xl shadow-green-100"
               >Confirm Addition</button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 p-12 relative flex flex-col max-h-[95vh]">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors z-10 font-black">✕</button>
            <div className="flex justify-center mb-8 shrink-0"><div className="scale-75">{LOGO_SVG}</div></div>
            <div className="overflow-y-auto hide-scrollbar">
              {authStep === 'persona' ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-center uppercase mb-6 tracking-widest text-slate-900">Lab Access Hub</h2>
                  <button onClick={() => { setAuthPersona('admin'); setAuthStep('form'); setAuthMode('signin'); }} className="w-full flex items-center gap-6 p-6 bg-slate-900 text-white rounded-[24px] hover:bg-black transition-colors group shadow-xl"><AdminIconSmall /> <span className="text-xs font-black uppercase tracking-widest group-hover:text-[#FFB800]">Central Admin</span></button>
                  <button onClick={() => { setAuthPersona('user'); setAuthStep('form'); setAuthMode('signin'); }} className="w-full flex items-center gap-6 p-6 bg-slate-100 rounded-[24px] hover:bg-slate-200 transition-colors group shadow-inner"><UserIconSmall /> <span className="text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-black">User Account</span></button>
                </div>
              ) : authStep === 'form' ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">{authPersona === 'admin' ? 'Root Authentication' : (authMode === 'signin' ? 'Portal Entry' : 'New Lab Member')}</h2>
                  </div>
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authPersona === 'user' && authMode === 'signup' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                          <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                        </div>
                        <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                      </>
                    )}
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] transition-all" />
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] transition-all" />
                    <button type="submit" disabled={isSending} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl mt-4">{isSending ? 'Transmitting...' : (authMode === 'signin' ? 'Authorize Access' : 'Initialize Account')}</button>
                  </form>
                  {authPersona === 'user' && (
                    <div className="text-center pt-4">
                      <button 
                        onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors underline"
                      >
                        {authMode === 'signin' ? "Need a User account? Join the lab" : "Already registered? Back to sign in"}
                      </button>
                    </div>
                  )}
                  <button onClick={() => setAuthStep('persona')} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors border-2 border-slate-50 rounded-xl mt-2">Back to Roles</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Protocol Verification</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Input the 6-digit handshake code sent to your terminal.</p>
                  </div>
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <input 
                      required 
                      type="text" 
                      maxLength={6}
                      value={verificationInput} 
                      onChange={e => setVerificationInput(e.target.value)} 
                      placeholder="Enter 6-Digit Code" 
                      className="w-full px-5 py-6 bg-slate-50 rounded-xl outline-none font-black text-center text-2xl tracking-[0.5em] border-2 border-transparent focus:border-[#FFB800]" 
                    />
                    <button type="submit" className="w-full bg-[#FFB800] text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Complete Handshake</button>
                  </form>
                  <button onClick={() => setAuthStep('form')} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors">Abort and Restart</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 py-6 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="cursor-pointer" onClick={() => { setCurrentTab(NavigationTab.HOME); setSelectedCategory(null); setAccountSubView('menu'); setCheckoutStep(null); setSelectedProject(null); }}>{LOGO_SVG}</div>
          <div className="flex-1 max-w-xl w-full relative">
            <input type="text" placeholder="Search blueprints..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 rounded-full py-4 px-12 border-2 border-transparent focus:border-[#FFB800] outline-none text-sm font-bold shadow-inner" />
            <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
          </div>
          <div className="flex items-center gap-8">
            <div onClick={() => isLoggedIn ? setCurrentTab(NavigationTab.ACCOUNT) : setShowAuthModal(true)} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg></div>
              <div className="flex flex-col"><span className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Account</span><span className="text-xs font-black uppercase leading-none group-hover:text-[#FFB800]">{isLoggedIn ? (currentUser?.firstName || 'User') : 'Sign In'}</span></div>
            </div>
            <div onClick={() => { setCurrentTab(NavigationTab.CART); setCheckoutStep(null); setSelectedProject(null); }} className="bg-[#8cc63f] px-6 py-4 rounded-2xl text-white flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all">
              <div className="relative"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2.5"/></svg>{cartCount > 0 && <span className="absolute -top-3 -right-3 bg-red-500 w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>}</div>
              <div className="flex flex-col"><span className="text-[10px] font-black opacity-80 uppercase leading-none mb-1">Cart</span><span className="text-sm font-black leading-none">BDT {cartTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </header>

      {checkoutStep ? renderCheckoutFlow() : (
        selectedProject ? renderProjectDetails() : 
        currentTab === NavigationTab.HOME ? (
          <div className="max-w-7xl mx-auto w-full px-8 py-12 flex flex-col md:flex-row gap-12">
            <aside className="w-full md:w-72 flex-shrink-0">
              <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden sticky top-32">
                <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-xs font-black uppercase">Navigation</h3>{selectedCategory && <button onClick={() => setSelectedCategory(null)} className="text-[9px] font-black text-[#FFB800] uppercase underline">Reset</button>}</div>
                <div className="py-4">{SIDEBAR_CATEGORIES.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${selectedCategory === cat ? 'bg-[#FFB800] text-black' : 'text-slate-400 hover:text-[#FFB800]'}`}>{cat}</button>)}</div>
              </div>
            </aside>
            <main className="flex-1 space-y-16">
              <div className="rounded-[40px] overflow-hidden shadow-2xl"><HeroCarousel /></div>
              <section>
                <div className="flex items-baseline justify-between mb-8"><h2 className="text-3xl font-black uppercase italic tracking-tighter">{selectedCategory || 'Active Kits'}</h2><span className="text-[10px] font-black text-slate-300 uppercase">{filteredInventory.length} results</span></div>
                {filteredInventory.length === 0 ? <div className="bg-white border-2 border-dashed border-slate-100 rounded-[40px] py-40 text-center flex flex-col items-center gap-6"><svg className="w-16 h-16 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0 a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 v2M7 7h10" strokeWidth="2.5"/></svg><p className="text-xl font-black text-slate-200 uppercase">No active blueprints</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredInventory.map(p => <ProjectCard key={p.id} project={p} onAddToCart={(proj) => addToCart(proj, 1)} onViewDetails={(proj) => { setSelectedProject(proj); setCurrentTab(NavigationTab.PROJECT_DETAILS); window.scrollTo(0,0); }} />)}</div>}
              </section>
            </main>
          </div>
        ) : currentTab === NavigationTab.ACCOUNT ? (
          <div className="max-w-6xl mx-auto py-12 px-6">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-10">Your Account</h1>
            {accountSubView === 'menu' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>} label="INFORMATION" onClick={() => setAccountSubView('information')} />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>} label="ADDRESSES" onClick={() => setAccountSubView('addresses')} />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2.5"/></svg>} label="ORDER HISTORY AND DETAILS" onClick={() => setAccountSubView('orders')} />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>} label="CREDIT SLIPS" />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 7h.01M7 11h.01M7 15h.01M13.414 2.086a2 2 0 012.828 0l5.656 5.656a2 2 0 010 2.828l-8.485 8.485a2 2 0 01-2.828 0l-5.656-5.656a2 2 0 010-2.828l8.485-8.485z" strokeWidth="2.5"/></svg>} label="VOUCHERS" />
                <AccountCard icon={<div className="relative"><svg className="w-8 h-8 text-[#FFB800]" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z"/></svg></div>} label="MY LOYALTY POINTS" />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeWidth="2"/></svg>} label="MY REVIEWS" onClick={() => setAccountSubView('reviews')} />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2.5"/><path d="M12 9v6m-3-3h6" strokeWidth="2.5"/></svg>} label="SAVED CARTS" onClick={() => setAccountSubView('saved-carts')} />
                <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2.5"/></svg>} label="OUT OF STOCK SUBSCRIPTIONS" />
                {currentUser?.role === 'admin' && (
                  <>
                    <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0 a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 v2M7 7h10" strokeWidth="2.5"/></svg>} label="LAB INVENTORY" onClick={() => setAccountSubView('inventory')} />
                    <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeWidth="2.5"/></svg>} label="CONFIRMED ORDER STATUS" onClick={() => setAccountSubView('confirmed-orders')} />
                  </>
                )}
              </div>
            ) : accountSubView === 'information' ? renderInformation() : accountSubView === 'addresses' ? renderAddressesManager() : accountSubView === 'inventory' ? renderInventoryManager() : accountSubView === 'confirmed-orders' ? renderConfirmedOrdersManager() : accountSubView === 'reviews' ? renderReviewsManager() :  accountSubView === 'orders' ? (
              <div className="max-w-4xl mx-auto py-12 px-6">
                <div className="flex items-center gap-4 mb-10">
                  <button onClick={() => setAccountSubView('menu')} className="text-slate-400 hover:text-black">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Your Orders</h1>
                </div>
                {(!currentUser?.orders || currentUser.orders.length === 0) ? <p className="text-center text-slate-300 font-black uppercase py-20">No orders found</p> : (
                  <div className="space-y-6">
{currentUser.orders.map(o => (
  <div key={o.id} className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-[#FFB800] transition-colors group">
    <div className="flex-1">
      <div className="flex items-center gap-3 mb-2">
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
          {o.id}
        </span>
        <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${o.status === 'Confirmed' ? 'bg-blue-100 text-blue-600' : o.status === 'Shipped' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
          {o.status}
        </span>
      </div>
      <p className="text-sm font-black text-slate-900">{o.date}</p>
      <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{o.items.length} Items • BDT {o.total.toLocaleString()}</p>
    </div>
    
    <div className="flex items-center gap-4">
      {/* THE NEW RECEIPT BUTTON */}
      <button 
        onClick={() => setViewingReceipt(o)}
        className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all shadow-lg active:scale-95 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2"/></svg>
        Receipt
      </button>
    </div>
  </div>
))}
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-16 flex justify-center"><button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setCurrentTab(NavigationTab.HOME); setSelectedProject(null); }} className="bg-[#f44336] text-white px-12 py-3.5 rounded font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all">Log OUT</button></div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-20 px-8 text-center">
            <h1 className="text-4xl font-black uppercase italic mb-8">Engineering Cart</h1>
            {cart.length === 0 ? <p className="text-slate-300 font-black uppercase tracking-widest">No blueprints staged</p> : (
              <div className="space-y-4">
                {cart.map(item => <div key={item.id} className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between"><div className="flex items-center gap-6"><img src={item.image} className="w-16 h-16 object-contain"/><span className="font-black text-xs uppercase">{item.name} x {item.quantity}</span></div><span className="font-black">BDT {(item.price * item.quantity).toLocaleString()}</span></div>)}
                <div className="pt-10 border-t border-slate-100 flex flex-col items-center gap-6">
                  <div className="flex justify-between w-full max-sm"><span className="text-lg font-black uppercase text-slate-400">Total</span><span className="text-2xl font-black">BDT {cartTotal.toLocaleString()}</span></div>
                  <button onClick={startCheckout} className="bg-black text-white px-20 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all shadow-xl">Confirm Deployment</button>
                </div>
              </div>
            )}
          </div>
        )
      )}
      {renderReceipt()}
     <footer className="bg-slate-900 text-white py-20 px-8 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-16">
          
          {/* Left Side: Logo & Copyright */}
          <div className="max-w-xs">
             <div className="scale-100 origin-left mb-6">{LOGO_SVG}</div>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
               © 2025 Circuit Projects Lab.<br/>Root Access Authorized.
             </p>
          </div>

          {/* Right Side: Contact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
            
            {/* Column 1: Services */}
            <div className="space-y-8">
               <div>
                  <h4 className="text-[#FFB800] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#FFB800] rounded-full"></span>
                    IEEE & PPTX Files (Provide ORDER ID)
                  </h4>
                  <p className="text-xl font-black text-slate-200 tracking-tight">01788-582369</p>
               </div>
               
               <div>
                  <h4 className="text-[#FFB800] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#FFB800] rounded-full"></span>
                    3D Print, Fashion & Hobbies
                  </h4>
                  <p className="text-xl font-black text-slate-200 tracking-tight">01788-582369</p>
               </div>
            </div>

            {/* Column 2: Logistics */}
            <div>
               <h4 className="text-[#FFB800] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#FFB800] rounded-full"></span>
                  Delivery Contacts
               </h4>
               <div className="space-y-2">
                 <p className="text-xl font-black text-slate-200 tracking-tight">01317-389344(Primary)</p>
                 <p className="text-xl font-black text-slate-200 tracking-tight">01601-582379</p>
               </div>
            </div>

          </div>
        </div>
      </footer>
    </div> // This closes the main container div
  );
};

export default App;