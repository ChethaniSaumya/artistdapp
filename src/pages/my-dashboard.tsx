import React from 'react';

const MyDashBoard: React.FC = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <iframe
        src="https://hopecoinkk.musecoinx.com/my-dashboard"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0,
          display: 'block'
        }}
        title="My Dashboard"
        allowFullScreen
      />
    </div>
  );
};

export default MyDashBoard;