import React from 'react';
import './Button.css';

const Button = ({ variant = 'primary', children, ...props }) => {
  return (
    <button className={`button button--${variant}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
