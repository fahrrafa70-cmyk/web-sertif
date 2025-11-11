# Quick Performance Guide

## 🚀 New Performance Tools Available

### 1. Optimized Image Component
Use for all images to get automatic lazy loading and progressive loading:

```tsx
import { OptimizedImage } from '@/components/ui/optimized-image';

<OptimizedImage
  src="/path/to/image.png"
  alt="Description"
  width={800}
  height={600}
  fallbackSrc="/fallback.png" // Optional
/>
```

### 2. Virtual Scrolling Hook
Use for lists with 50+ items:

```tsx
import { useVirtualScroll } from '@/hooks/use-virtual-scroll';

const { virtualItems, totalHeight, offsetY } = useVirtualScroll(items, {
  itemHeight: 80,
  containerHeight: 600,
  overscan: 3
});

// Render only virtualItems instead of all items
```

### 3. Performance Monitor
Track slow operations in development:

```tsx
import { performanceMonitor } from '@/lib/utils/performance-monitor';

const data = await performanceMonitor.measure('fetchData', async () => {
  return await fetchData();
});

// View metrics
performanceMonitor.logSummary();
```

## ✅ Best Practices

### Component Optimization
```tsx
import { memo, useMemo, useCallback } from 'react';

// Wrap components that receive props
export const MyComponent = memo(function MyComponent({ data }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return expensiveOperation(data);
  }, [data]);

  // Memoize callbacks
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
});
```

### Animation Optimization
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ 
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] // Cubic bezier for smooth GPU animation
  }}
  style={{ willChange: 'transform, opacity' }} // GPU acceleration hint
>
  Content
</motion.div>
```

### Data Fetching
```tsx
// Already optimized with caching and deduplication
import { useCertificates } from '@/hooks/use-certificates';

const { certificates, loading, error } = useCertificates();
// Automatic caching, deduplication, and optimistic updates
```

## 🎯 When to Use What

| Scenario | Solution | File |
|----------|----------|------|
| List with 50+ items | Virtual Scrolling | `use-virtual-scroll.ts` |
| Any image | Optimized Image | `optimized-image.tsx` |
| Expensive calculation | `useMemo` | React built-in |
| Event handler | `useCallback` | React built-in |
| Component with props | `React.memo` | React built-in |
| Track performance | Performance Monitor | `performance-monitor.ts` |
| Search input | Debounce | `use-debounce.ts` |

## 🔍 Performance Checklist

Before deploying:
- [ ] Large lists use virtual scrolling
- [ ] Images use OptimizedImage component
- [ ] Components with props are memoized
- [ ] Expensive calculations use useMemo
- [ ] Event handlers use useCallback
- [ ] Animations use GPU-accelerated properties
- [ ] Search inputs are debounced
- [ ] No console.logs in production

## 📊 Monitoring

### Development
```tsx
// Add to any component
useEffect(() => {
  const cleanup = measureRenderTime('ComponentName');
  return cleanup;
}, []);
```

### Production
Check Core Web Vitals:
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

## 🐛 Common Issues

### Issue: Component re-renders too often
**Solution:** Wrap with `React.memo` and use `useCallback` for props

### Issue: List scrolling is janky
**Solution:** Implement virtual scrolling

### Issue: Images load slowly
**Solution:** Use `OptimizedImage` component

### Issue: Animations are choppy
**Solution:** Use only `transform` and `opacity`, add `willChange`

### Issue: Search is slow
**Solution:** Use `useDebounce` hook (already implemented)

## 📚 Documentation

- Full details: `PERFORMANCE_OPTIMIZATIONS.md`
- Virtual scroll guide: `VIRTUAL_SCROLL_IMPLEMENTATION.md`
- This quick guide: `QUICK_PERFORMANCE_GUIDE.md`

---

**Remember:** Optimize only when needed. Premature optimization is the root of all evil!
