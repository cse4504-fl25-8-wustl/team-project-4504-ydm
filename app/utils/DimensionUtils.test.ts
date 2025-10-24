import { describe, it, expect } from 'vitest'
import { DimensionUtils } from './DimensionUtils'

describe('DimensionUtils', () => {
  describe('roundUpDimension', () => {
    it('should round up decimal values to next whole number', () => {
      expect(DimensionUtils.roundUpDimension(24.1)).toBe(25)
      expect(DimensionUtils.roundUpDimension(18.9)).toBe(19)
      expect(DimensionUtils.roundUpDimension(2.01)).toBe(3)
    })

    it('should return same value for whole numbers', () => {
      expect(DimensionUtils.roundUpDimension(24)).toBe(24)
      expect(DimensionUtils.roundUpDimension(36)).toBe(36)
      expect(DimensionUtils.roundUpDimension(0)).toBe(0)
    })

    it('should handle very small decimal values', () => {
      expect(DimensionUtils.roundUpDimension(0.1)).toBe(1)
      expect(DimensionUtils.roundUpDimension(0.001)).toBe(1)
      expect(DimensionUtils.roundUpDimension(0.999)).toBe(1)
    })

    it('should handle large values', () => {
      expect(DimensionUtils.roundUpDimension(999.99)).toBe(1000)
      expect(DimensionUtils.roundUpDimension(1000.01)).toBe(1001)
    })
  })

  describe('getPlanarFootprint', () => {
    it('should return dimensions sorted with longSide first', () => {
      const result = DimensionUtils.getPlanarFootprint(24, 18)
      expect(result.longSide).toBe(24)
      expect(result.shortSide).toBe(18)
    })

    it('should handle reversed input (width > length)', () => {
      const result = DimensionUtils.getPlanarFootprint(18, 24)
      expect(result.longSide).toBe(24)
      expect(result.shortSide).toBe(18)
    })

    it('should round up decimal dimensions', () => {
      const result = DimensionUtils.getPlanarFootprint(24.3, 18.7)
      expect(result.longSide).toBe(25)
      expect(result.shortSide).toBe(19)
    })

    it('should handle equal dimensions', () => {
      const result = DimensionUtils.getPlanarFootprint(36, 36)
      expect(result.longSide).toBe(36)
      expect(result.shortSide).toBe(36)
    })

    it('should handle standard box dimensions (36x36)', () => {
      const result = DimensionUtils.getPlanarFootprint(36, 36)
      expect(result.longSide).toBe(36)
      expect(result.shortSide).toBe(36)
    })

    it('should handle telescoping box dimensions (84x36)', () => {
      const result = DimensionUtils.getPlanarFootprint(84, 36)
      expect(result.longSide).toBe(84)
      expect(result.shortSide).toBe(36)
    })

    it('should correctly sort dimensions from expected output examples', () => {
      // From Input1: 55x31 should be longSide=55, shortSide=31
      const result1 = DimensionUtils.getPlanarFootprint(31, 55)
      expect(result1.longSide).toBe(55)
      expect(result1.shortSide).toBe(31)

      // From Input1: 47x34 should be longSide=47, shortSide=34
      const result2 = DimensionUtils.getPlanarFootprint(34, 47)
      expect(result2.longSide).toBe(47)
      expect(result2.shortSide).toBe(34)

      // From Input2: 46x34 should be longSide=46, shortSide=34
      const result3 = DimensionUtils.getPlanarFootprint(34, 46)
      expect(result3.longSide).toBe(46)
      expect(result3.shortSide).toBe(34)
    })
  })

  describe('getLargestDimension', () => {
    it('should return the largest of three dimensions', () => {
      expect(DimensionUtils.getLargestDimension(24, 18, 2)).toBe(24)
      expect(DimensionUtils.getLargestDimension(18, 24, 2)).toBe(24)
      expect(DimensionUtils.getLargestDimension(2, 18, 24)).toBe(24)
    })

    it('should round up the largest dimension', () => {
      expect(DimensionUtils.getLargestDimension(24.3, 18.7, 2.1)).toBe(25)
      expect(DimensionUtils.getLargestDimension(18, 24.9, 2)).toBe(25)
    })

    it('should handle equal dimensions', () => {
      expect(DimensionUtils.getLargestDimension(10, 10, 10)).toBe(10)
    })

    it('should handle height as largest dimension', () => {
      expect(DimensionUtils.getLargestDimension(10, 15, 20)).toBe(20)
    })
  })

  describe('validateDimensions', () => {
    it('should not throw for valid positive dimensions', () => {
      expect(() => DimensionUtils.validateDimensions(24, 18, 2)).not.toThrow()
      expect(() => DimensionUtils.validateDimensions(36, 36)).not.toThrow()
    })

    it('should throw for zero length', () => {
      expect(() => DimensionUtils.validateDimensions(0, 18, 2)).toThrow('Invalid length: 0')
    })

    it('should throw for negative length', () => {
      expect(() => DimensionUtils.validateDimensions(-24, 18, 2)).toThrow('Invalid length: -24')
    })

    it('should throw for zero width', () => {
      expect(() => DimensionUtils.validateDimensions(24, 0, 2)).toThrow('Invalid width: 0')
    })

    it('should throw for negative width', () => {
      expect(() => DimensionUtils.validateDimensions(24, -18, 2)).toThrow('Invalid width: -18')
    })

    it('should throw for zero height when provided', () => {
      expect(() => DimensionUtils.validateDimensions(24, 18, 0)).toThrow('Invalid height: 0')
    })

    it('should throw for negative height when provided', () => {
      expect(() => DimensionUtils.validateDimensions(24, 18, -2)).toThrow('Invalid height: -2')
    })

    it('should throw for non-finite values', () => {
      expect(() => DimensionUtils.validateDimensions(Infinity, 18, 2)).toThrow('Invalid length')
      expect(() => DimensionUtils.validateDimensions(24, NaN, 2)).toThrow('Invalid width')
      expect(() => DimensionUtils.validateDimensions(24, 18, Infinity)).toThrow('Invalid height')
    })

    it('should allow height to be undefined', () => {
      expect(() => DimensionUtils.validateDimensions(24, 18)).not.toThrow()
      expect(() => DimensionUtils.validateDimensions(24, 18, undefined)).not.toThrow()
    })
  })

  describe('fitsWithin', () => {
    it('should return true when item fits in container', () => {
      // 24x18x2 fits in 36x36x11
      expect(DimensionUtils.fitsWithin(24, 18, 2, 36, 36, 11)).toBe(true)
    })

    it('should return false when item is too large', () => {
      // 40x40x2 does not fit in 36x36x11
      expect(DimensionUtils.fitsWithin(40, 40, 2, 36, 36, 11)).toBe(false)
    })

    it('should handle rotated dimensions correctly', () => {
      // 18x24x2 should fit in 36x36x11 (rotated)
      expect(DimensionUtils.fitsWithin(18, 24, 2, 36, 36, 11)).toBe(true)
      
      // 36x24x2 should fit in 24x36x11 (rotated)
      expect(DimensionUtils.fitsWithin(36, 24, 2, 24, 36, 11)).toBe(true)
    })

    it('should return false when height exceeds container height', () => {
      // 24x18x15 does not fit in 36x36x11 (height too large)
      expect(DimensionUtils.fitsWithin(24, 18, 15, 36, 36, 11)).toBe(false)
    })

    it('should handle exact fit dimensions', () => {
      // 36x36x11 fits exactly in 36x36x11
      expect(DimensionUtils.fitsWithin(36, 36, 11, 36, 36, 11)).toBe(true)
    })

    it('should round up dimensions before comparison', () => {
      // 35.5x35.5x10.5 rounds to 36x36x11, should fit in 36x36x11
      expect(DimensionUtils.fitsWithin(35.5, 35.5, 10.5, 36, 36, 11)).toBe(true)
      
      // 36.1x35x10 rounds to 37x36x11, should not fit in 36x36x11
      expect(DimensionUtils.fitsWithin(36.1, 35, 10, 36, 36, 11)).toBe(false)
    })

    it('should validate standard box fit scenarios', () => {
      // Standard box: 36x36x11
      // Item 33x43 fits (one side ≤36, can telescope)
      expect(DimensionUtils.fitsWithin(33, 43, 2, 36, 84, 11)).toBe(true)
      
      // Item 55x31 fits (one side ≤36, can telescope to 84)
      expect(DimensionUtils.fitsWithin(31, 55, 2, 36, 84, 11)).toBe(true)
      
      // Item 37x37 does not fit in standard (both sides >36)
      expect(DimensionUtils.fitsWithin(37, 37, 2, 36, 36, 11)).toBe(false)
    })

    it('should validate large box fit scenarios', () => {
      // Large box: 44x44x13
      // Item 40x38 fits
      expect(DimensionUtils.fitsWithin(40, 38, 2, 44, 44, 13)).toBe(true)
      
      // Item 45x40 does not fit
      expect(DimensionUtils.fitsWithin(45, 40, 2, 44, 44, 13)).toBe(false)
    })
  })

  describe('calculateSurfaceArea', () => {
    it('should calculate surface area correctly', () => {
      expect(DimensionUtils.calculateSurfaceArea(24, 18)).toBe(432)
      expect(DimensionUtils.calculateSurfaceArea(36, 36)).toBe(1296)
    })

    it('should handle decimal dimensions', () => {
      expect(DimensionUtils.calculateSurfaceArea(24.5, 18.5)).toBe(453.25)
    })

    it('should throw for invalid dimensions', () => {
      expect(() => DimensionUtils.calculateSurfaceArea(0, 18)).toThrow()
      expect(() => DimensionUtils.calculateSurfaceArea(-24, 18)).toThrow()
    })
  })

  describe('calculateVolume', () => {
    it('should calculate volume correctly', () => {
      expect(DimensionUtils.calculateVolume(24, 18, 2)).toBe(864)
      expect(DimensionUtils.calculateVolume(36, 36, 11)).toBe(14256)
    })

    it('should handle decimal dimensions', () => {
      expect(DimensionUtils.calculateVolume(10.5, 10.5, 10.5)).toBe(1157.625)
    })

    it('should throw for invalid dimensions', () => {
      expect(() => DimensionUtils.calculateVolume(0, 18, 2)).toThrow()
      expect(() => DimensionUtils.calculateVolume(24, -18, 2)).toThrow()
      expect(() => DimensionUtils.calculateVolume(24, 18, 0)).toThrow()
    })
  })
})
