import * as React from 'react';
import { CssBaseline, Box } from '@mui/material';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import DataGridLayout from './DataGridLayout';

export default function App() {
  return (
    <>
      <CssBaseline enableColorScheme />
      <Box>
        <DataGridLayout />
      </Box>
    </>
  );
}
