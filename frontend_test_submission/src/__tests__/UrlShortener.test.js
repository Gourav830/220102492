import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UrlShortener from '../components/UrlShortener';

// Create test theme
const theme = createTheme();

// Mock fetch for testing
global.fetch = jest.fn();

// Helper function to render component with theme
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('UrlShortener Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders URL shortener form', () => {
    renderWithTheme(<UrlShortener />);
    
    expect(screen.getByText('URL Shortener')).toBeInTheDocument();
    expect(screen.getByLabelText(/Enter URL to shorten/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Validity Period/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Shortcode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shorten URL/i })).toBeInTheDocument();
  });

  test('shows validation error for empty URL', async () => {
    renderWithTheme(<UrlShortener />);
    
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('URL is required')).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid URL format', async () => {
    renderWithTheme(<UrlShortener />);
    
    const urlInput = screen.getByLabelText(/Enter URL to shorten/);
    fireEvent.change(urlInput, { target: { value: 'not-a-valid-url' } });
    
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid URL format')).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid validity period', async () => {
    renderWithTheme(<UrlShortener />);
    
    const urlInput = screen.getByLabelText(/Enter URL to shorten/);
    const validityInput = screen.getByLabelText(/Validity Period/);
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.change(validityInput, { target: { value: '-5' } });
    
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Validity period must be a positive integer (in minutes)')).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid preferred shortcode', async () => {
    renderWithTheme(<UrlShortener />);
    
    const urlInput = screen.getByLabelText(/Enter URL to shorten/);
    const shortcodeInput = screen.getByLabelText(/Preferred Shortcode/);
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.change(shortcodeInput, { target: { value: '0' } });
    
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Preferred shortcode must be a positive integer')).toBeInTheDocument();
    });
  });

  test('successfully shortens URL with mock API response', async () => {
    const mockResponse = {
      shortenedUrl: 'http://localhost:4000/abc123',
      shortcode: 'abc123'
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse
    });

    renderWithTheme(<UrlShortener />);
    
    const urlInput = screen.getByLabelText(/Enter URL to shorten/);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/very-long-url' } });
    
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('URL shortened successfully!')).toBeInTheDocument();
    });

    // Check if the URL appears in the list
    expect(screen.getByText('Shortened URLs (1/5)')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/very-long-url')).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithTheme(<UrlShortener />);
    
    const urlInput = screen.getByLabelText(/Enter URL to shorten/);
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to shorten URL: Network error/)).toBeInTheDocument();
    });
  });

  test('prevents shortening more than 5 URLs', async () => {
    // Mock 5 successful responses
    const mockResponse = {
      shortenedUrl: 'http://localhost:4000/test',
      shortcode: 'test'
    };
    
    for (let i = 0; i < 5; i++) {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ...mockResponse,
          shortcode: `test${i}`,
          shortenedUrl: `http://localhost:4000/test${i}`
        })
      });
    }

    renderWithTheme(<UrlShortener />);
    
    const urlInput = screen.getByLabelText(/Enter URL to shorten/);
    const submitButton = screen.getByRole('button', { name: /Shorten URL/i });
    
    // Add 5 URLs
    for (let i = 0; i < 5; i++) {
      fireEvent.change(urlInput, { target: { value: `https://example${i}.com` } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('URL shortened successfully!')).toBeInTheDocument();
      });
    }
    
    // Try to add 6th URL
    fireEvent.change(urlInput, { target: { value: 'https://example6.com' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Maximum 5 URLs can be shortened concurrently')).toBeInTheDocument();
    });
  });
});