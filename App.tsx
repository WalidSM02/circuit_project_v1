
import React, { useState, useEffect, useRef } from 'react';
import { Project, CartItem, NavigationTab } from './types';
import { PROJECTS, SIDEBAR_CATEGORIES, LOGO_SVG } from './constants';
import { HeroCarousel } from './components/HeroCarousel';
import { ProjectCard } from './components/ProjectCard';

// ==========================================
// SYSTEM CONFIGURATION - ADMIN CREDENTIALS
// ==========================================
const ADMIN_CONFIG = {
  email: 'sheikhwalid017@gmail.com',
  password: 'sheikhwalid123',
  firstName: 'Admin',
  lastName: 'Root'
};

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
  const [inventory, setInventory] = useState<Project[]>(() => {
    const saved = localStorage.getItem('cp_inventory');
    return saved ? JSON.parse(saved) : PROJECTS;
  });

  const [verifiedUsers, setVerifiedUsers] = useState<UserData[]>(() => {
    const saved = localStorage.getItem('cp_users');
    if (saved) return JSON.parse(saved);
    return [{
      firstName: ADMIN_CONFIG.firstName,
      lastName: ADMIN_CONFIG.lastName,
      email: ADMIN_CONFIG.email,
      password: ADMIN_CONFIG.password,
      role: 'admin',
      phone: 'SYSTEM',
      addresses: [],
      orders: [],
      reviews: []
    }];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [authPersona, setAuthPersona] = useState<'user' | 'admin' | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authStep, setAuthStep] = useState<'persona' | 'form'>('persona');
  const [isSending, setIsSending] = useState(false);
  
  const [currentTab, setCurrentTab] = useState<NavigationTab>(NavigationTab.HOME);
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

  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<Partial<Project>>({
    name: '', description: '', price: 0, reference: '', category: SIDEBAR_CATEGORIES[0], inStock: true, rating: 5, reviewCount: 0, image: '', video: '', specs: [],
    priceAdjustmentType: 'none', priceAdjustmentAmount: 0
  });

  const [viewingItemsOrder, setViewingItemsOrder] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem('cp_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('cp_users', JSON.stringify(verifiedUsers));
  }, [verifiedUsers]);

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

  const addNotification = (text: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    
    setTimeout(() => {
      const normalizedEmail = email.toLowerCase().trim();
      if (authMode === 'signin') {
        const user = verifiedUsers.find(u => u.email.toLowerCase() === normalizedEmail && u.password === password);
        if (user) {
          setIsLoggedIn(true);
          setCurrentUser(user);
          setShowAuthModal(false);
          setAuthStep('persona');
          addNotification(`Welcome back, ${user.firstName}`);
        } else {
          addNotification("Invalid credentials.");
        }
      } else {
        const exists = verifiedUsers.find(u => u.email.toLowerCase() === normalizedEmail);
        if (exists) {
          addNotification("Email already registered.");
        } else {
          const newUser: UserData = { 
            firstName, 
            lastName, 
            email: normalizedEmail, 
            phone, 
            password, 
            role: 'user', 
            addresses: [], 
            orders: [], 
            reviews: [] 
          };
          setVerifiedUsers(prev => [...prev, newUser]);
          setIsLoggedIn(true);
          setCurrentUser(newUser);
          setShowAuthModal(false);
          setAuthStep('persona');
          addNotification(`Account created! Welcome ${firstName}`);
        }
      }
      setIsSending(false);
    }, 800);
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

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();

    // Logic to calculate originalPrice and discount based on current price and adjustment
    const sellingPrice = projectForm.price || 0;
    const adjustmentType = projectForm.priceAdjustmentType || 'none';
    const adjustmentAmount = projectForm.priceAdjustmentAmount || 0;
    
    let finalOriginalPrice: number | undefined = undefined;
    let finalDiscount: string | undefined = undefined;

    if (adjustmentType === 'reduced' && adjustmentAmount > 0) {
      finalOriginalPrice = sellingPrice + adjustmentAmount;
      finalDiscount = `- BDT ${adjustmentAmount.toLocaleString()}`;
    } else if (adjustmentType === 'increased' && adjustmentAmount > 0) {
      finalOriginalPrice = sellingPrice - adjustmentAmount;
      finalDiscount = `+ BDT ${adjustmentAmount.toLocaleString()}`;
    }

    if (editingProject) {
      setInventory(prev => prev.map(p => p.id === editingProject.id ? { 
        ...p, 
        ...projectForm, 
        price: sellingPrice,
        originalPrice: finalOriginalPrice,
        discount: finalDiscount,
        rating: Number(projectForm.rating ?? 5),
        reviewCount: Number(projectForm.reviewCount ?? 0)
      } as Project : p));
      addNotification("Blueprint updated successfully.");
    } else {
      const newProject: Project = { 
        id: `proj-${Date.now()}`,
        name: projectForm.name || '',
        description: projectForm.description || 'Project blueprint description not available.',
        price: sellingPrice,
        originalPrice: finalOriginalPrice,
        discount: finalDiscount,
        category: projectForm.category || SIDEBAR_CATEGORIES[0],
        image: projectForm.image || '',
        specs: projectForm.specs || [],
        reference: projectForm.reference || generateReference(projectForm.category || SIDEBAR_CATEGORIES[0]),
        rating: Number(projectForm.rating ?? 5),
        reviewCount: Number(projectForm.reviewCount ?? 0),
        inStock: projectForm.inStock ?? true,
        video: projectForm.video,
        priceAdjustmentType: adjustmentType,
        priceAdjustmentAmount: adjustmentAmount
      };
      setInventory(prev => [newProject, ...prev]);
      addNotification("New blueprint added to lab inventory.");
    }
    setIsAddingProject(false);
    setEditingProject(null);
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

  const handleFinalizeOrder = () => {
    if (!currentUser || !trxId.trim()) {
      addNotification("Please enter bKash Transaction ID.");
      return;
    }

    const shippingAddr = currentUser.addresses.find(a => a.id === selectedShippingId);
    const billingAddr = currentUser.addresses.find(a => a.id === selectedBillingId);

    const newOrder: Order = {
      id: tempOrderId,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      items: JSON.parse(JSON.stringify(cart)), // Deep copy cart
      total: cartTotal,
      status: 'Confirmed',
      trxId: trxId.trim(),
      shippingAddress: shippingAddr,
      billingAddress: billingAddr,
      userEmail: currentUser.email,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      userPhone: currentUser.phone
    };

    const updatedUser = { 
      ...currentUser, 
      orders: [newOrder, ...(currentUser.orders || [])] 
    };
    
    // Update global and current state
    setCurrentUser(updatedUser);
    setVerifiedUsers(prev => prev.map(u => 
      u.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : u
    ));
    
    setCart([]);
    setCheckoutStep(null);
    setTrxId('');
    setTempOrderId('');
    addNotification("Purchase successful! Database updated.");
    setCurrentTab(NavigationTab.ACCOUNT);
    setAccountSubView('orders');
  };

  const updateOrderStatus = (userEmail: string, orderId: string, newStatus: Order['status']) => {
    setVerifiedUsers(prev => prev.map(user => {
      if (user.email.toLowerCase() === userEmail.toLowerCase()) {
        const updatedOrders = user.orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        );
        const updatedUser = { ...user, orders: updatedOrders };
        if (currentUser?.email.toLowerCase() === userEmail.toLowerCase()) setCurrentUser(updatedUser);
        return updatedUser;
      }
      return user;
    }));
    addNotification(`Status changed to ${newStatus}`);
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
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 p-10">
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
              description: '', specs: [], priceAdjustmentType: 'none', priceAdjustmentAmount: 0 
            }); 
          }} 
          className="bg-black text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black rounded-2xl transition-all"
        >
          + Add New Blueprint
        </button>
      </div>

      {(isAddingProject || editingProject) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 p-8 flex justify-between items-center border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{editingProject ? 'Modify Blueprint' : 'New Blueprint'}</h3>
              <button onClick={() => { setIsAddingProject(false); setEditingProject(null); }} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSaveProject} className="p-10 space-y-4 overflow-y-auto hide-scrollbar">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Blueprint Name</label>
                <input required type="text" value={projectForm.name || ''} onChange={e => setProjectForm({...projectForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
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

              {/* Price Adjustment Logic (Optional) */}
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

              {/* Review & Feedback Curation (Optional) */}
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
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Category Sector</label>
                <select 
                  value={projectForm.category || SIDEBAR_CATEGORIES[0]} 
                  onChange={e => {
                    const newCat = e.target.value;
                    const newRef = generateReference(newCat);
                    setProjectForm({...projectForm, category: newCat, reference: newRef});
                  }} 
                  className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold appearance-none cursor-pointer border-2 border-transparent focus:border-[#FFB800]"
                >
                  {SIDEBAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
                {projectForm.image && (
                  <div className="mt-4 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                    <img src={projectForm.image} className="w-12 h-12 object-contain rounded-lg bg-white border border-slate-200" alt="Preview" />
                    <span className="text-[9px] font-black uppercase text-slate-400 truncate flex-1">Image Loaded</span>
                    <button type="button" onClick={() => setProjectForm({...projectForm, image: ''})} className="text-red-500 hover:text-red-700 p-2">✕</button>
                  </div>
                )}
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
                {projectForm.video && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Demo Preview Active
                      </span>
                      <button type="button" onClick={() => setProjectForm({...projectForm, video: ''})} className="text-red-400 hover:text-red-500 text-xs font-black uppercase underline">Remove Clip</button>
                    </div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      <video src={projectForm.video} controls className="w-full h-full object-contain" autoPlay muted loop />
                    </div>
                  </div>
                )}
                <p className="mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Supports direct links or device upload (Max 50MB suggested)</p>
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
              {p.video && (
                <div className="absolute -bottom-1 -right-1 bg-black text-white p-1 rounded-md">
                   <svg className="w-3 h-3 text-[#FFB800]" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.reference} • {p.category}</p>
              <h4 className="text-sm font-black text-slate-900 uppercase">{p.name}</h4>
              <p className="text-sm font-black text-green-600">
                BDT {p.price.toLocaleString()}
                {p.priceAdjustmentType !== 'none' && p.priceAdjustmentAmount ? (
                   <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded ${p.priceAdjustmentType === 'reduced' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                     {p.priceAdjustmentType === 'reduced' ? '-' : '+'} {p.priceAdjustmentAmount}
                   </span>
                ) : null}
                <span className="ml-3 text-[10px] text-slate-400 uppercase">
                  ⭐ {p.rating} ({p.reviewCount} revs)
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { setEditingProject(p); setProjectForm({...p}); setIsAddingProject(true); }} 
                className="px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#FFB800] transition-colors"
              >
                Edit
              </button>
              <button 
                onClick={() => {
                  if(confirm("Confirm deletion from lab inventory?")) {
                    setInventory(prev => prev.filter(x => x.id !== p.id));
                    addNotification("Project removed.");
                  }
                }} 
                className="px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:border-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConfirmedOrdersManager = () => {
    // Dynamically aggregate ALL orders from the synchronized user list
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
        
        {/* Product List Popup */}
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

        {checkoutStep === 'address' && (
          <div className="bg-white p-12 rounded-[40px] shadow-2xl animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black uppercase tracking-widest mb-4 text-slate-900 text-center">Deployment Destination</h2>
            <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Select logistics coordinates</p>
            
            <div className="space-y-12">
              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipping Target</h3>
                  <button onClick={() => { setAccountSubView('addresses'); setCheckoutStep(null); setCurrentTab(NavigationTab.ACCOUNT); }} className="text-[10px] font-black text-[#FFB800] uppercase underline">+ Add New</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser?.addresses.map(addr => (
                    <button 
                      key={addr.id} 
                      onClick={() => setSelectedShippingId(addr.id)}
                      className={`p-6 rounded-3xl border-2 text-left transition-all relative ${selectedShippingId === addr.id ? 'border-[#FFB800] bg-orange-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <span className="block text-[9px] font-black uppercase text-slate-300 mb-2">{addr.type} Target</span>
                      <p className="text-xs font-black text-slate-900 uppercase">{addr.street}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{addr.city}, {addr.zip}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billing Registry</h3>
                  <button onClick={() => setSelectedBillingId(selectedShippingId)} className="text-[10px] font-black text-slate-900 uppercase underline">Same as Shipping</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser?.addresses.map(addr => (
                    <button 
                      key={addr.id} 
                      onClick={() => setSelectedBillingId(addr.id)}
                      className={`p-6 rounded-3xl border-2 text-left transition-all relative ${selectedBillingId === addr.id ? 'border-[#FFB800] bg-orange-50/30' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <span className="block text-[9px] font-black uppercase text-slate-300 mb-2">{addr.type} Target</span>
                      <p className="text-xs font-black text-slate-900 uppercase">{addr.street}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{addr.city}, {addr.zip}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-16">
              <button onClick={() => setCheckoutStep('info')} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">Back to Info</button>
              <button 
                onClick={() => {
                  if (!selectedShippingId || !selectedBillingId) {
                    addNotification("Please select both target addresses.");
                    return;
                  }
                  setTempOrderId(`CP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
                  setCheckoutStep('payment');
                }} 
                className="flex-1 py-5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#FFB800] hover:text-black transition-all"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {checkoutStep === 'payment' && (
          <div className="bg-white p-12 rounded-[40px] shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
            <div className="bg-[#D12053] text-white px-10 py-4 rounded-3xl font-black text-xl mb-12 shadow-xl shadow-pink-100">bKash Portal</div>
            
            <div className="w-full max-sm space-y-8">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-6">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">bKash Account (Personal)</span>
                  <p className="text-3xl font-black text-pink-600 tracking-wider">01768-466333</p>
                </div>
                <div className="pt-6 border-t border-slate-200">
                  <span className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Payment Amount</span>
                  <p className="text-2xl font-black text-slate-900">BDT {cartTotal.toLocaleString()}</p>
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

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 p-12 relative flex flex-col max-h-[95vh]">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors z-10">✕</button>
            <div className="flex justify-center mb-8 shrink-0"><div className="scale-75">{LOGO_SVG}</div></div>
            <div className="overflow-y-auto hide-scrollbar">
              {authStep === 'persona' ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-center uppercase mb-6 tracking-widest text-slate-900">Access Portal</h2>
                  <button onClick={() => { setAuthPersona('admin'); setAuthStep('form'); setAuthMode('signin'); }} className="w-full flex items-center gap-6 p-6 bg-slate-900 text-white rounded-[24px] hover:bg-black transition-colors group"><AdminIconSmall /> <span className="text-xs font-black uppercase tracking-widest group-hover:text-[#FFB800]">Administrator</span></button>
                  <button onClick={() => { setAuthPersona('user'); setAuthStep('form'); setAuthMode('signin'); }} className="w-full flex items-center gap-6 p-6 bg-slate-100 rounded-[24px] hover:bg-slate-200 transition-colors group"><UserIconSmall /> <span className="text-xs font-black uppercase tracking-widest text-slate-600 group-hover:text-black">User Account</span></button>
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-center uppercase mb-8 tracking-widest text-slate-900">{authPersona === 'admin' ? 'Root Authentication' : (authMode === 'signin' ? 'User Entry' : 'Create User Account')}</h2>
                  {authPersona === 'user' && (
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
                      <button onClick={() => setAuthMode('signin')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${authMode === 'signin' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Sign In</button>
                      <button onClick={() => setAuthMode('signup')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${authMode === 'signup' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Create Account</button>
                    </div>
                  )}
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authPersona === 'user' && authMode === 'signup' && (
                      <div className="grid grid-cols-2 gap-3">
                        <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                        <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />
                      </div>
                    )}
                    {authPersona === 'user' && authMode === 'signup' && <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800]" />}
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] transition-all" />
                    <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold border-2 border-transparent focus:border-[#FFB800] transition-all" />
                    <button type="submit" disabled={isSending} className="w-full bg-[#0f172a] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-lg mt-4">{isSending ? 'Authenticating...' : 'Authorize'}</button>
                  </form>
                  <button onClick={() => setAuthStep('persona')} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors border-2 border-slate-50 rounded-xl">Back to Roles</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 py-6 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="cursor-pointer" onClick={() => { setCurrentTab(NavigationTab.HOME); setSelectedCategory(null); setAccountSubView('menu'); setCheckoutStep(null); }}>{LOGO_SVG}</div>
          <div className="flex-1 max-w-xl w-full">
            <input type="text" placeholder="Search blueprints..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 rounded-full py-4 px-12 border-2 border-transparent focus:border-[#FFB800] outline-none text-sm font-bold" />
          </div>
          <div className="flex items-center gap-8">
            <div onClick={() => isLoggedIn ? setCurrentTab(NavigationTab.ACCOUNT) : setShowAuthModal(true)} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg></div>
              <div className="flex flex-col"><span className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Account</span><span className="text-xs font-black uppercase leading-none group-hover:text-[#FFB800]">{isLoggedIn ? (currentUser?.firstName || 'User') : 'Sign In'}</span></div>
            </div>
            <div onClick={() => { setCurrentTab(NavigationTab.CART); setCheckoutStep(null); }} className="bg-[#8cc63f] px-6 py-4 rounded-2xl text-white flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all">
              <div className="relative"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2.5"/></svg>{cartCount > 0 && <span className="absolute -top-3 -right-3 bg-red-500 w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>}</div>
              <div className="flex flex-col"><span className="text-[10px] font-black opacity-80 uppercase leading-none mb-1">Cart</span><span className="text-sm font-black leading-none">BDT {cartTotal.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </header>

      {checkoutStep ? renderCheckoutFlow() : (
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
                {filteredInventory.length === 0 ? <div className="bg-white border-2 border-dashed border-slate-100 rounded-[40px] py-40 text-center flex flex-col items-center gap-6"><svg className="w-16 h-16 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0 a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="2.5"/></svg><p className="text-xl font-black text-slate-200 uppercase">No active blueprints</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{filteredInventory.map(p => <ProjectCard key={p.id} project={p} onAddToCart={(proj) => { const exc = cart.find(x => x.id === proj.id); if(exc) setCart(cart.map(x => x.id === proj.id ? {...x, quantity: x.quantity + 1} : x)); else setCart([...cart, {...proj, quantity: 1}]); addNotification(`${proj.name} added.`); }} />)}</div>}
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
                    <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0 a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth="2.5"/></svg>} label="LAB INVENTORY" onClick={() => setAccountSubView('inventory')} />
                    <AccountCard icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeWidth="2.5"/></svg>} label="CONFIRMED ORDER STATUS" onClick={() => setAccountSubView('confirmed-orders')} />
                  </>
                )}
              </div>
            ) : accountSubView === 'information' ? renderInformation() : accountSubView === 'addresses' ? renderAddressesManager() : accountSubView === 'inventory' ? renderInventoryManager() : accountSubView === 'confirmed-orders' ? renderConfirmedOrdersManager() : accountSubView === 'orders' ? (
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
                      <div key={o.id} className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex-1">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID: {o.id}</span>
                          <p className="text-sm font-black text-slate-900">{o.date}</p>
                          <p className="text-xs font-bold text-slate-500 mt-2 uppercase">Status: {o.status}</p>
                        </div>
                        <div className="text-right">
                           <span className="text-lg font-black text-slate-900">BDT {o.total.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-16 flex justify-center"><button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setCurrentTab(NavigationTab.HOME); }} className="bg-[#4caf50] text-white px-12 py-3.5 rounded font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all">Sign Out</button></div>
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
      <footer className="bg-slate-900 text-white py-20 px-10 mt-auto"><div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12"><div>{LOGO_SVG}<p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-6">© 2025 Circuit Projects Lab. Root Access Authorized.</p></div></div></footer>
    </div>
  );
};

export default App;
