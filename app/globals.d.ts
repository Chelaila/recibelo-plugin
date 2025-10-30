declare module "*.css";

// Declaraciones para componentes personalizados de Shopify App Bridge
declare global {
  namespace JSX {
    interface IntrinsicElements {
      's-app-nav': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      's-link': React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
      }, HTMLAnchorElement>;
      
      // Componentes de Shopify UI
      's-page': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        heading: string;
      }, HTMLElement>;
      
      's-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        heading: string;
      }, HTMLElement>;
      
      's-paragraph': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      
      's-layout': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      
      's-layout-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      
      's-data-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        headings: Array<{ content: string | React.ReactNode }>;
        rows: Array<Array<{ content: string | React.ReactNode }>>;
      }, HTMLElement>;
      
      's-text-field': React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement> & {
        label: string;
        onChange: (value: string) => void;
      }, HTMLInputElement>;
      
      's-text': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        variant?: 'headingMd' | 'bodyMd' | 'bodySm';
        tone?: 'subdued' | 'critical' | 'success';
      }, HTMLElement>;
      
      's-badge': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        tone: 'success' | 'critical' | 'warning' | 'info';
      }, HTMLElement>;
      
      's-button': React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: 'primary' | 'secondary' | 'tertiary' | 'critical';
        size?: 'micro' | 'slim' | 'medium' | 'large';
        onClick: () => void;
      }, HTMLButtonElement>;
      
      's-select': React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement> & {
        label: string;
        value: string;
        onChange: (value: string) => void;
        options: Array<{ label: string; value: string }>;
      }, HTMLSelectElement>;
      
      's-empty-state': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        heading: string;
        image: string;
      }, HTMLElement>;
      
      's-spinner': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        size?: 'small' | 'large';
      }, HTMLElement>;
    }
  }
}

import React from 'react';
