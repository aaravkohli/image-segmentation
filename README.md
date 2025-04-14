# Image Segmentation using Backtracking and Optimized Otsu's Method

This project implements two image segmentation algorithms:
1. A backtracking-based approach that explores different threshold levels
2. An optimized version of Otsu's thresholding method

## Features

- Backtracking-based segmentation that maximizes region contrast
- Optimized Otsu's thresholding with early termination
- Performance comparison between both methods
- Real-time visualization of segmentation results

## Requirements

- C++17 or later
- OpenCV 4.x
- CMake 3.10 or later

## Building the Project

1. Create a build directory:
```bash
mkdir build
cd build
```

2. Configure and build:
```bash
cmake ..
make
```

## Usage

Run the program with an image path as argument:
```bash
./image_segmentation path/to/your/image.jpg
```

The program will:
1. Display the original image
2. Show the segmentation results from both methods
3. Print the execution time for each method

## Algorithm Details

### Backtracking Segmentation
- Explores different threshold levels recursively
- Maximizes region contrast between foreground and background
- Uses a maximum iteration limit to prevent excessive computation

### Optimized Otsu's Method
- Implements an efficient version of Otsu's thresholding
- Uses early termination to improve performance
- Calculates between-class variance for optimal threshold selection

## Performance Analysis

The program measures and displays the execution time for both segmentation methods, allowing for direct comparison of their efficiency. 