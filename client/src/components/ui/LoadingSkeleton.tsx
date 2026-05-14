import React from 'react';

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`bg-echo-elevated animate-pulse rounded-lg ${className}`}
      style={style}
    />
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="w-full h-full bg-echo-card flex flex-col justify-end p-6">
      {/* Top-right mood badge placeholder */}
      <div className="absolute top-6 right-6">
        <Shimmer className="w-20 h-6 rounded-full" />
      </div>

      {/* Center waveform */}
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <Shimmer className="w-full h-16 rounded-xl" />
      </div>

      {/* Bottom-left: avatar + name */}
      <div className="flex items-center gap-3">
        <Shimmer className="w-12 h-12 rounded-full" />
        <div className="space-y-2">
          <Shimmer className="w-32 h-4" />
          <Shimmer className="w-20 h-3" />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-5">
        {[...Array(5)].map((_, i) => (
          <Shimmer key={i} className="w-10 h-10 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="w-full max-w-mobile mx-auto">
      {/* Hero */}
      <div className="h-56 bg-echo-card flex flex-col items-center justify-end pb-6 gap-3">
        <Shimmer className="w-24 h-24 rounded-full" />
        <Shimmer className="w-40 h-5" />
        <Shimmer className="w-24 h-4" />
      </div>
      {/* Stats row */}
      <div className="flex justify-around py-5 bg-echo-card border-b border-echo-elevated">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Shimmer className="w-10 h-5" />
            <Shimmer className="w-16 h-3" />
          </div>
        ))}
      </div>
      {/* Posts grid */}
      <div className="grid grid-cols-3 gap-0.5 mt-1">
        {[...Array(6)].map((_, i) => (
          <Shimmer key={i} className="aspect-square" style={{ borderRadius: 0 } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="w-3/4 h-4" />
        <Shimmer className="w-1/3 h-3" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-echo-elevated/50">
      {[...Array(count)].map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}
