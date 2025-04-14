import cv2
import numpy as np
from typing import Tuple, List, Dict
import math

class ImageSegmenter:
    def __init__(self, image: np.ndarray):
        """Initialize the ImageSegmenter with an input image."""
        self.original_image = image
        self.grayscale_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        self.histogram = self.get_histogram(self.grayscale_image)
        
    def get_histogram(self, image: np.ndarray) -> List[int]:
        """Calculate the histogram of the image."""
        histogram = [0] * 256
        for pixel in image.ravel():
            histogram[pixel] += 1
        return histogram
    
    def get_histogram_analysis(self) -> Dict:
        """Analyze the image histogram."""
        total_pixels = sum(self.histogram)
        mean = sum(i * count for i, count in enumerate(self.histogram)) / total_pixels
        variance = sum((i - mean) ** 2 * count for i, count in enumerate(self.histogram)) / total_pixels
        std_dev = math.sqrt(variance)
        
        # Find peaks and valleys
        peaks = []
        valleys = []
        for i in range(1, 255):
            if (self.histogram[i] > self.histogram[i-1] and 
                self.histogram[i] > self.histogram[i+1]):
                peaks.append(i)
            elif (self.histogram[i] < self.histogram[i-1] and 
                  self.histogram[i] < self.histogram[i+1]):
                valleys.append(i)
        
        return {
            'mean': mean,
            'std_dev': std_dev,
            'peaks': peaks,
            'valleys': valleys,
            'histogram': self.histogram
        }
    
    def calculate_region_contrast(self, threshold: int) -> float:
        """Calculate the contrast between foreground and background regions."""
        # Create binary mask
        _, binary = cv2.threshold(self.grayscale_image, threshold, 255, cv2.THRESH_BINARY)
        
        # Calculate statistics for foreground and background
        foreground = self.grayscale_image[binary == 255]
        background = self.grayscale_image[binary == 0]
        
        if len(foreground) == 0 or len(background) == 0:
            return 0.0
            
        # Calculate mean and standard deviation
        fg_mean, fg_std = np.mean(foreground), np.std(foreground)
        bg_mean, bg_std = np.mean(background), np.std(background)
        
        # Calculate contrast
        contrast = abs(fg_mean - bg_mean) / (fg_std + bg_std + 1e-6)
        return contrast
    
    def calculate_segmentation_metrics(self, binary_image: np.ndarray) -> Dict:
        """Calculate various metrics for the segmented image."""
        # Calculate region sizes
        foreground_pixels = np.sum(binary_image == 255)
        background_pixels = np.sum(binary_image == 0)
        total_pixels = binary_image.size
        
        # Calculate region homogeneity
        foreground = self.grayscale_image[binary_image == 255]
        background = self.grayscale_image[binary_image == 0]
        
        fg_homogeneity = 1 - (np.std(foreground) / 255) if len(foreground) > 0 else 0
        bg_homogeneity = 1 - (np.std(background) / 255) if len(background) > 0 else 0
        
        # Calculate edge strength
        edges = cv2.Canny(binary_image, 100, 200)
        edge_strength = np.sum(edges) / (255 * edges.size)
        
        return {
            'foreground_ratio': foreground_pixels / total_pixels,
            'background_ratio': background_pixels / total_pixels,
            'foreground_homogeneity': fg_homogeneity,
            'background_homogeneity': bg_homogeneity,
            'edge_strength': edge_strength
        }
    
    def backtracking_segmentation(self, max_iterations: int = 1000) -> Tuple[np.ndarray, List[float], List[float], List[Dict]]:
        """Perform segmentation using backtracking approach."""
        thresholds = []
        contrasts = []
        metrics_history = []
        best_threshold = 128
        best_contrast = 0.0
        
        # Initial threshold
        current_threshold = 128
        step = 64
        
        for _ in range(max_iterations):
            # Calculate contrast for current threshold
            contrast = self.calculate_region_contrast(current_threshold)
            
            # Create binary image for metrics
            _, binary = cv2.threshold(self.grayscale_image, current_threshold, 255, cv2.THRESH_BINARY)
            metrics = self.calculate_segmentation_metrics(binary)
            
            # Store values
            thresholds.append(current_threshold)
            contrasts.append(contrast)
            metrics_history.append(metrics)
            
            # Update best values
            if contrast > best_contrast:
                best_contrast = contrast
                best_threshold = current_threshold
            
            # Adjust threshold
            if step < 1:
                break
                
            # Try higher threshold
            higher_threshold = min(255, current_threshold + step)
            higher_contrast = self.calculate_region_contrast(higher_threshold)
            
            # Try lower threshold
            lower_threshold = max(0, current_threshold - step)
            lower_contrast = self.calculate_region_contrast(lower_threshold)
            
            # Choose direction
            if higher_contrast > contrast and higher_contrast > lower_contrast:
                current_threshold = higher_threshold
            elif lower_contrast > contrast:
                current_threshold = lower_threshold
            else:
                step = step // 2
        
        # Create final segmented image
        _, segmented = cv2.threshold(self.grayscale_image, best_threshold, 255, cv2.THRESH_BINARY)
        return segmented, thresholds, contrasts, metrics_history
    
    def optimized_otsu_segmentation(self) -> Tuple[np.ndarray, Dict]:
        """Perform segmentation using Otsu's method."""
        # Calculate histogram
        histogram = self.get_histogram(self.grayscale_image)
        total_pixels = self.grayscale_image.size
        
        # Calculate Otsu's threshold
        best_threshold = 0
        max_variance = 0.0
        
        for threshold in range(256):
            # Calculate weights
            w1 = sum(histogram[:threshold+1]) / total_pixels
            w2 = 1 - w1
            
            if w1 == 0 or w2 == 0:
                continue
            
            # Calculate means
            sum1 = sum(i * histogram[i] for i in range(threshold+1))
            sum2 = sum(i * histogram[i] for i in range(threshold+1, 256))
            
            mean1 = sum1 / (w1 * total_pixels) if w1 > 0 else 0
            mean2 = sum2 / (w2 * total_pixels) if w2 > 0 else 0
            
            # Calculate between-class variance
            variance = w1 * w2 * (mean1 - mean2) ** 2
            
            if variance > max_variance:
                max_variance = variance
                best_threshold = threshold
        
        # Create segmented image
        _, segmented = cv2.threshold(self.grayscale_image, best_threshold, 255, cv2.THRESH_BINARY)
        
        # Calculate metrics
        metrics = self.calculate_segmentation_metrics(segmented)
        
        return segmented, metrics