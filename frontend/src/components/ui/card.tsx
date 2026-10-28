import SpringText from './spring-text';
import * as React from 'react';
import clsx from 'clsx';
import './card.css';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) =>
  <div ref={ref} className={clsx('ms-card', className)} {...props} />);
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) =>
  <div ref={ref} className={clsx('ms-card-header', className)} {...props} />);
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) =>
  <SpringText tag="h3" ref={ref} className={clsx('ms-card-title', className)} {...props} />);
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) =>
  <p ref={ref} className={clsx('ms-card-description', className)} {...props} />);
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) =>
  <div ref={ref} className={clsx('ms-card-content', className)} {...props} />);
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) =>
  <div ref={ref} className={clsx('ms-card-footer', className)} {...props} />);

Card.displayName = 'Card'; CardHeader.displayName = 'CardHeader'; CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription'; CardContent.displayName = 'CardContent'; CardFooter.displayName = 'CardFooter';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
