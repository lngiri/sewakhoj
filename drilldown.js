/**
 * Drill-Down Functionality for SewaKhoj
 * Makes all summary tables, cards, and aggregated data clickable
 */

const API_URL = 'https://sewakhoj.onrender.com/api';

// CSS for drill-down elements
const drillDownCSS = `
.clickable-summary {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.clickable-summary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.clickable-summary:active {
  transform: translateY(0);
}

.clickable-summary::after {
  content: '🔍';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.clickable-summary:hover::after {
  opacity: 0.7;
}

/* Drill-down modal styles */
.drilldown-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.drilldown-modal.active {
  display: flex;
}

.drilldown-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.drilldown-header {
  background: linear-gradient(135deg, #C0392B, #96281B);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drilldown-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}

.drilldown-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.drilldown-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.drilldown-body {
  padding: 2rem;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.drilldown-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.drilldown-stat {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.2rem;
  text-align: center;
}

.drilldown-stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: #C0392B;
  margin-bottom: 0.3rem;
}

.drilldown-stat-label {
  font-size: 0.9rem;
  color: #6B7280;
}

.drilldown-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.drilldown-table th {
  background: #f1f5f9;
  padding: 0.8rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.drilldown-table td {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.drilldown-table tr:hover {
  background: #f9fafb;
}

.drilldown-empty {
  text-align: center;
  padding: 3rem;
  color: #6B7280;
  font-style: italic;
}

.drilldown-loading {
  text-align: center;
  padding: 3rem;
  color: #6B7280;
}

.drilldown-loading::after {
  content: '...';
  animation: loadingDots 1.5s infinite;
}

@keyframes loadingDots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
`;

// Add CSS to document
function addDrillDownStyles() {
  if (!document.querySelector('#drilldown-styles')) {
    const style = document.createElement('style');
    style.id = 'drilldown-styles';
    style.textContent = drillDownCSS;
    document.head.appendChild(style);
  }
}

// Create modal HTML
function createDrillDownModal() {
  if (!document.querySelector('#drilldown-modal')) {
    const modal = document.createElement('div');
    modal.id = 'drilldown-modal';
    modal.className = 'drilldown-modal';
    modal.innerHTML = `
      <div class="drilldown-content">
        <div class="drilldown-header">
          <h2 class="drilldown-title">Detailed View</h2>
          <button class="drilldown-close" onclick="closeDrillDownModal()">×</button>
        </div>
        <div class="drilldown-body" id="drilldown-body">
          <div class="drilldown-loading">Loading data</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Show drill-down modal with data
async function showDrillDownModal(title, endpoint, params = {}) {
  addDrillDownStyles();
  createDrillDownModal();
  
  const modal = document.getElementById('drilldown-modal');
  const titleEl = modal.querySelector('.drilldown-title');
  const bodyEl = document.getElementById('drilldown-body');
  
  titleEl.textContent = title;
  bodyEl.innerHTML = '<div class="drilldown-loading">Loading data</div>';
  modal.classList.add('active');
  
  try {
    // Build query string from params
    const queryParams = new URLSearchParams(params).toString();
    const url = `${API_URL}/${endpoint}${queryParams ? '?' + queryParams : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      renderDrillDownData(bodyEl, data, endpoint);
    } else {
      bodyEl.innerHTML = `<div class="drilldown-empty">Error loading data: ${data.message || 'Unknown error'}</div>`;
    }
  } catch (error) {
    console.error('Drill-down error:', error);
    bodyEl.innerHTML = `<div class="drilldown-empty">Failed to load data. Please try again.</div>`;
  }
}

// Render data in modal based on endpoint type
function renderDrillDownData(container, data, endpoint) {
  if (endpoint.includes('bookings')) {
    renderBookingsData(container, data);
  } else if (endpoint.includes('workers')) {
    renderWorkersData(container, data);
  } else if (endpoint.includes('ratings')) {
    renderRatingsData(container, data);
  } else {
    renderGenericData(container, data);
  }
}

// Render bookings data
function renderBookingsData(container, data) {
  const { data: bookings, total, filtered, filters } = data;
  
  let html = `
    <div class="drilldown-stats">
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${total}</div>
        <div class="drilldown-stat-label">Total Bookings</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filtered}</div>
        <div class="drilldown-stat-label">Filtered Results</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filters.status || 'All'}</div>
        <div class="drilldown-stat-label">Status</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filters.service || 'All'}</div>
        <div class="drilldown-stat-label">Service</div>
      </div>
    </div>
  `;
  
  if (bookings.length === 0) {
    html += '<div class="drilldown-empty">No bookings found with the selected filters.</div>';
  } else {
    html += `
      <table class="drilldown-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Service</th>
            <th>Status</th>
            <th>Date</th>
            <th>Time</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(booking => `
            <tr>
              <td><strong>${booking.full_name}</strong><br>${booking.phone}</td>
              <td>${booking.service}</td>
              <td><span class="badge badge-${booking.status}">${booking.status}</span></td>
              <td>${new Date(booking.preferred_date).toLocaleDateString()}</td>
              <td>${booking.preferred_time}</td>
              <td>${booking.address || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 1rem; font-size: 0.9rem; color: #6B7280;">
        Showing ${bookings.length} of ${total} bookings
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Render workers data
function renderWorkersData(container, data) {
  const { data: workers, total, filtered, filters } = data;
  
  let html = `
    <div class="drilldown-stats">
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${total}</div>
        <div class="drilldown-stat-label">Total Workers</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filtered}</div>
        <div class="drilldown-stat-label">Filtered Results</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filters.status || 'All'}</div>
        <div class="drilldown-stat-label">Status</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filters.service || 'All'}</div>
        <div class="drilldown-stat-label">Service</div>
      </div>
    </div>
  `;
  
  if (workers.length === 0) {
    html += '<div class="drilldown-empty">No workers found with the selected filters.</div>';
  } else {
    html += `
      <table class="drilldown-table">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Service</th>
            <th>Status</th>
            <th>Experience</th>
            <th>Rating</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          ${workers.map(worker => `
            <tr>
              <td><strong>${worker.full_name}</strong><br>${worker.area || 'N/A'}</td>
              <td>${worker.service}</td>
              <td><span class="badge badge-${worker.status}">${worker.status}</span></td>
              <td>${worker.experience || 'N/A'}</td>
              <td>${worker.averageRating || 'N/A'} ★ (${worker.totalRatings || 0})</td>
              <td>${worker.phone}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 1rem; font-size: 0.9rem; color: #6B7280;">
        Showing ${workers.length} of ${total} workers
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Render ratings data
function renderRatingsData(container, data) {
  const { data: ratings, total, filtered, averageRating, filters } = data;
  
  let html = `
    <div class="drilldown-stats">
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${total}</div>
        <div class="drilldown-stat-label">Total Ratings</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filtered}</div>
        <div class="drilldown-stat-label">Filtered Results</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${averageRating.toFixed(1)}</div>
        <div class="drilldown-stat-label">Average Rating</div>
      </div>
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${filters.minRating || 'Any'}-${filters.maxRating || 'Any'}</div>
        <div class="drilldown-stat-label">Rating Range</div>
      </div>
    </div>
  `;
  
  if (ratings.length === 0) {
    html += '<div class="drilldown-empty">No ratings found with the selected filters.</div>';
  } else {
    html += `
      <table class="drilldown-table">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Rating</th>
            <th>Comment</th>
            <th>Date</th>
            <th>Customer</th>
          </tr>
        </thead>
        <tbody>
          ${ratings.map(rating => `
            <tr>
              <td>
                <strong>${rating.worker?.full_name || 'Unknown Worker'}</strong><br>
                ${rating.worker?.service || 'N/A'}
              </td>
              <td>
                <div style="color: #F0A500; font-weight: bold;">
                  ${'★'.repeat(Math.round(rating.rating))}${'☆'.repeat(5 - Math.round(rating.rating))}
                  (${rating.rating.toFixed(1)})
                </div>
              </td>
              <td>${rating.comment || 'No comment'}</td>
              <td>${new Date(rating.createdAt).toLocaleDateString()}</td>
              <td>${rating.customer_name || 'Anonymous'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 1rem; font-size: 0.9rem; color: #6B7280;">
        Showing ${ratings.length} of ${total} ratings
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Render generic data (fallback)
function renderGenericData(container, data) {
  container.innerHTML = `
    <div class="drilldown-stats">
      <div class="drilldown-stat">
        <div class="drilldown-stat-value">${data.filtered || data.data?.length || 0}</div>
        <div class="drilldown-stat-label">Results</div>
      </div>
    </div>
    <pre style="background: #f8f9fa; padding: 1rem; border-radius: 8px; overflow: auto; max-height: 400px;">
${JSON.stringify(data, null, 2)}
    </pre>
  `;
}

// Close modal
function closeDrillDownModal() {
  const modal = document.getElementById('drilldown-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Initialize drill-down functionality
function initDrillDown() {
  addDrillDownStyles();
  createDrillDownModal();
  
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrillDownModal();
    }
  });
  
  // Close modal on background click
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('drilldown-modal');
    if (modal && modal.classList.contains('active') && e.target === modal) {
      closeDrillDownModal();
    }
  });
  
  console.log('✅ Drill-down functionality initialized');
}

// Export functions for global use
window.showDrillDownModal = showDrillDownModal;
window.closeDrillDownModal = closeDrillDownModal;
window.initDrillDown = initDrillDown;

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDrillDown);
} else {
  initDrillDown();
}