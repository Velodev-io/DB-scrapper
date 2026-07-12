import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Shop, type Paginated } from '@carry/shared'
import { getPendingRecords } from '../../lib/uploadQueue'
import { ShopDetailModal } from './ShopDetailModal'

export function ShopList() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [shopList, setShopList] = useState<Shop[]>([])
  const [pendingShops, setPendingShops] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const limit = 10

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const fetchShops = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')

      const res = await api.get<Paginated<Shop>>(
        `/shops/mine?page=${pageNum}&limit=${limit}`,
        token
      )

      if (append) {
        setShopList(prev => [...prev, ...res.data])
      } else {
        setShopList(res.data)
      }
      setTotal(res.total)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shops')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShops(1, false)
  }, [fetchShops])

  useEffect(() => {
    async function loadPending() {
      try {
        const records = await getPendingRecords()
        const shops = records
          .filter(r => r.type === 'shop')
          .map(r => ({
            id:          r.id,
            shopName:    r.payload.shopName,
            shopType:    r.payload.shopType,
            keeperName:  r.payload.keeperName,
            keeperPhone: r.payload.keeperPhone,
            address:     r.payload.address,
            isPendingSync: true,
          }))
        setPendingShops(shops)
      } catch {
        // Ignore
      }
    }
    loadPending()
  }, [])

  const allShops = [...pendingShops, ...shopList]
  const hasMore = shopList.length < total

  const handleSaved = (updated: Shop) => {
    setShopList(prev => prev.map(s => s.id === updated.id ? updated : s))
    setSelectedShop(null)
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 80px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', padding: '0.25rem',
              fontSize: '1.5rem', cursor: 'pointer', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>My Shops</h1>
        </div>
        <Link to="/shops/new" className="chip active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
          + New
        </Link>
      </div>

      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {allShops.map(shop => (
          <div
            key={shop.id}
            className="record-card"
            style={{ cursor: shop.isPendingSync ? 'default' : 'pointer' }}
            onClick={() => {
              if (!shop.isPendingSync) {
                setSelectedShop(shop as Shop)
              }
            }}
          >
            {shop.images && shop.images.length > 0 && !shop.isPendingSync ? (
              <img
                src={img.thumb(shop.images[0])}
                alt={shop.shopName}
                className="record-card-thumb"
                loading="lazy"
              />
            ) : (
              <div className="record-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🏪
              </div>
            )}
            <div className="record-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div className="record-card-title">{shop.shopName}</div>
                {shop.isPendingSync && (
                  <span className="status-badge queued" style={{ margin: 0, padding: '0.15rem 0.4rem', fontSize: '0.6rem' }}>
                    Syncing...
                  </span>
                )}
              </div>
              <div className="record-card-meta">
                <div style={{ color: 'var(--ochre)', fontWeight: 600 }}>{shop.shopType}</div>
                <div>{shop.keeperName} • {shop.keeperPhone}</div>
                {shop.address && <div>{shop.address}</div>}
              </div>
            </div>
          </div>
        ))}

        {allShops.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--concrete)' }}>
            No shops yet — tap the button to submit your first one
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            Loading shops…
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1rem', minHeight: '44px' }}
            onClick={() => fetchShops(page + 1, true)}
          >
            Load More
          </button>
        )}
      </div>

      {selectedShop && (
        <ShopDetailModal
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
