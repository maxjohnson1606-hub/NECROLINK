import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Gem, X, Package } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MERCH_CATEGORIES = ['All', 'jersey', 'hoodie', 'tshirt', 'mousepad', 'sticker', 'keychain'];
const TOPUP_CATEGORIES = ['All', 'diamonds', 'weekly_pass', 'starlight', 'event_pass'];

const OrderModal = ({ product, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    game_id: '', server_id: '', notes: '', quantity: 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API}/orders`, { ...formData, product_id: product.id });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const isTopup = product.section === 'topup';
  const total = (product.price * formData.quantity).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" data-testid="order-modal">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-darknet-surface border border-neon-purple p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border-glow-purple">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-neon-purple uppercase mb-1" data-testid="order-modal-title">Order</h2>
            <p className="font-body text-sm text-text-secondary">{product.name}</p>
            <p className="font-body text-lg text-neon-blue font-bold">${product.price}</p>
          </div>
          <button onClick={onClose} data-testid="close-order-btn" className="text-text-secondary hover:text-neon-red transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="bg-neon-red/10 border border-neon-red p-3 mb-4 font-body text-xs text-neon-red">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" data-testid="order-name" placeholder="Full Name *" required value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          <input type="email" data-testid="order-email" placeholder="Email *" required value={formData.customer_email}
            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          <input type="text" data-testid="order-phone" placeholder="Phone (optional)" value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />

          {isTopup && (
            <>
              <input type="text" data-testid="order-game-id" placeholder="MLBB User ID *" required value={formData.game_id}
                onChange={(e) => setFormData({ ...formData, game_id: e.target.value })}
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
              <input type="text" data-testid="order-server-id" placeholder="Server ID *" required value={formData.server_id}
                onChange={(e) => setFormData({ ...formData, server_id: e.target.value })}
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            </>
          )}

          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Quantity</label>
            <input type="number" data-testid="order-quantity" min="1" max="100" value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          </div>

          <textarea data-testid="order-notes" placeholder="Notes (optional)" rows={2} value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none" />

          <div className="border-t border-border-DEFAULT pt-3 flex justify-between items-center">
            <span className="font-body text-sm text-text-secondary">Total:</span>
            <span className="font-heading text-2xl font-bold text-neon-blue" data-testid="order-total">${total}</span>
          </div>

          <p className="font-body text-xs text-text-muted leading-relaxed">
            Admin will contact you via email to arrange payment after order is placed.
          </p>

          <button type="submit" data-testid="submit-order-btn" disabled={submitting}
            className="w-full px-4 py-3 bg-neon-red border border-neon-red text-white font-heading text-sm tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all disabled:opacity-50">
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ProductCard = ({ product, onOrder, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="bg-darknet-surface border border-border-DEFAULT overflow-hidden hover:border-neon-blue/50 transition-all flex flex-col"
    data-testid={`product-card-${product.id}`}
  >
    <div className="h-48 bg-darknet-terminal flex items-center justify-center overflow-hidden">
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
      ) : (
        <Package className="w-16 h-16 text-text-muted" />
      )}
    </div>
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] border border-neon-purple text-neon-purple">
          {product.category.replace('_', ' ')}
        </span>
        {product.stock !== null && product.stock !== undefined && product.stock < 10 && (
          <span className="px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] border border-neon-red text-neon-red">
            Low Stock: {product.stock}
          </span>
        )}
      </div>
      <h3 className="font-heading text-base font-bold text-white uppercase mb-1">{product.name}</h3>
      <p className="font-body text-xs text-text-secondary leading-relaxed mb-3 flex-1 line-clamp-3">{product.description}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="font-heading text-xl font-bold text-neon-blue">${product.price}</span>
        <button
          onClick={() => onOrder(product)}
          data-testid={`buy-product-${product.id}`}
          className="px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(255,0,60,0.6)] transition-all"
        >
          Buy Now
        </button>
      </div>
    </div>
  </motion.div>
);

export const Store = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('merchandise');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${API}/products`);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const sectionProducts = products.filter((p) => p.section === activeSection);
  const categories = activeSection === 'merchandise' ? MERCH_CATEGORIES : TOPUP_CATEGORIES;
  const filteredProducts = categoryFilter === 'All'
    ? sectionProducts
    : sectionProducts.filter((p) => p.category === categoryFilter);

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-red flex items-center justify-center border-glow-red">
              <ShoppingBag className="w-8 h-8 text-neon-red" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-red" data-testid="store-title">
            Store
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">
            Official NECROLINK merch & MLBB top-up services
          </p>
        </div>

        {successMessage && (
          <div className="bg-neon-blue/10 border border-neon-blue p-4 mb-6 max-w-2xl mx-auto" data-testid="order-success">
            <p className="font-body text-sm text-neon-blue">{successMessage}</p>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => { setActiveSection('merchandise'); setCategoryFilter('All'); }}
            data-testid="section-merchandise"
            className={`px-6 py-3 font-heading text-sm uppercase tracking-wider border-2 transition-all ${
              activeSection === 'merchandise'
                ? 'border-neon-blue bg-neon-blue/10 text-neon-blue border-glow-blue'
                : 'border-border-DEFAULT text-text-secondary hover:border-neon-blue/50'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Merchandise
          </button>
          <button
            onClick={() => { setActiveSection('topup'); setCategoryFilter('All'); }}
            data-testid="section-topup"
            className={`px-6 py-3 font-heading text-sm uppercase tracking-wider border-2 transition-all ${
              activeSection === 'topup'
                ? 'border-neon-purple bg-neon-purple/10 text-neon-purple border-glow-purple'
                : 'border-border-DEFAULT text-text-secondary hover:border-neon-purple/50'
            }`}
          >
            <Gem className="w-4 h-4 inline mr-2" />
            MLBB Top-Up
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              data-testid={`cat-filter-${cat}`}
              className={`px-3 py-1.5 font-body text-xs uppercase tracking-wider border transition-all ${
                categoryFilter === cat
                  ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                  : 'border-border-DEFAULT text-text-secondary hover:border-neon-purple/50 hover:text-neon-purple'
              }`}
            >
              {cat === 'All' ? cat : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-text-muted" data-testid="no-products">No products available in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onOrder={setSelectedProduct} />
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <OrderModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => {
            setSuccessMessage(`Order placed for "${selectedProduct.name}"! Check your email — admin will contact you for payment.`);
            setTimeout(() => setSuccessMessage(''), 6000);
          }}
        />
      )}
    </div>
  );
};
