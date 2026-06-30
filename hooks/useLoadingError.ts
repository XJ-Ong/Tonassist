'use client';

import { useState, useCallback } from 'react';

export function useLoadingError(initialError = '') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const clearError = useCallback(() => setError(''), []);

  return { loading, setLoading, error, setError, clearError };
}
