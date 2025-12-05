import { describe, it, expect } from 'vitest'
import { Art, ArtType, ArtMaterial, SpecialHandlingFlag } from './Art'

describe('Art', () => {
  const baseArtOptions = {
    id: 'ART-001',
    productType: ArtType.PaperPrint,
    material: ArtMaterial.NoGlazing,
    dimensions: {
      length: 24,
      width: 18,
      height: 2
    }
  }

  describe('constructor', () => {
    it('should create an Art instance with required properties', () => {
      const art = new Art(baseArtOptions)

      expect(art.getId()).toBe('ART-001')
      expect(art.getSku()).toBe('ART-001')
      expect(art.getProductType()).toBe(ArtType.PaperPrint)
      expect(art.getMaterial()).toBe(ArtMaterial.NoGlazing)
      expect(art.getQuantity()).toBe(1) // default quantity
    })

    it('should use default depth when height is not provided', () => {
      const optionsWithoutHeight = {
        ...baseArtOptions,
        dimensions: {
          length: 24,
          width: 18
          // height not provided
        }
      }

      const art = new Art(optionsWithoutHeight)
      const dimensions = art.getDimensions()

      expect(dimensions.height).toBe(2) // Default depth for unspecified material
    })

    it('should set custom quantity when provided', () => {
      const art = new Art({
        ...baseArtOptions,
        quantity: 3
      })

      expect(art.getQuantity()).toBe(3)
    })

    it('should handle special handling flags', () => {
      const art = new Art({
        ...baseArtOptions,
        specialHandlingFlags: [SpecialHandlingFlag.TactilePanel, SpecialHandlingFlag.ManualReview]
      })

      const flags = art.getSpecialHandlingFlags()
      expect(flags).toContain(SpecialHandlingFlag.TactilePanel)
      expect(flags).toContain(SpecialHandlingFlag.ManualReview)
      expect(flags).toHaveLength(2)
    })

    it('should handle optional labels and hardware information', () => {
      const art = new Art({
        ...baseArtOptions,
        description: 'Test artwork',
        finalMediumLabel: 'Canvas',
        glazingLabel: 'Acrylic',
        hardwareLabel: 'Hooks',
        hardwarePiecesPerItem: 2
      })

      expect(art.getDescription()).toBe('Test artwork')
      expect(art.getFinalMediumLabel()).toBe('Canvas')
      expect(art.getGlazingLabel()).toBe('Acrylic')
      expect(art.getHardwareLabel()).toBe('Hooks')
      expect(art.getHardwarePiecesPerItem()).toBe(2)
    })
  })

  describe('dimensions', () => {
    it('should return rounded dimensions', () => {
      const art = new Art({
        ...baseArtOptions,
        dimensions: {
          length: 24.3,
          width: 18.7,
          height: 2.1
        }
      })

      const dimensions = art.getDimensions()
      expect(dimensions.length).toBe(25) // Math.ceil(24.3)
      expect(dimensions.width).toBe(19)  // Math.ceil(18.7)
      expect(dimensions.height).toBe(3)  // Math.ceil(2.1)
    })

    it('should return raw dimensions for calculations', () => {
      const art = new Art({
        ...baseArtOptions,
        dimensions: {
          length: 24.3,
          width: 18.7,
          height: 2.1
        }
      })

      const rawDimensions = art.getRawDimensions()
      expect(rawDimensions.length).toBe(24.3)
      expect(rawDimensions.width).toBe(18.7)
      expect(rawDimensions.height).toBe(2.1)
    })

    it('should return rounded depth', () => {
      const art = new Art({
        ...baseArtOptions,
        dimensions: {
          length: 24,
          width: 18,
          height: 2.3
        }
      })

      expect(art.getDepth()).toBe(3) // Math.ceil(2.3)
    })
  })

  describe('hardware calculations', () => {
    it('should calculate total hardware pieces correctly', () => {
      const art = new Art({
        ...baseArtOptions,
        quantity: 3,
        hardwarePiecesPerItem: 4
      })

      expect(art.getHardwarePiecesTotal()).toBe(12) // 3 * 4
    })

    it('should return 0 for total hardware pieces when hardwarePiecesPerItem is undefined', () => {
      const art = new Art({
        ...baseArtOptions,
        quantity: 3
        // hardwarePiecesPerItem not provided
      })

      expect(art.getHardwarePiecesTotal()).toBe(0)
    })

    it('should handle zero quantity for hardware calculation', () => {
      const art = new Art({
        ...baseArtOptions,
        quantity: 0,
        hardwarePiecesPerItem: 4
      })

      expect(art.getHardwarePiecesTotal()).toBe(0) // 0 * 4
    })
  })

  describe('special handling flags', () => {
    it('should return empty array when no flags are set', () => {
      const art = new Art(baseArtOptions)
      const flags = art.getSpecialHandlingFlags()
      expect(flags).toEqual([])
    })

    it('should handle duplicate flags correctly', () => {
      const art = new Art({
        ...baseArtOptions,
        specialHandlingFlags: [
          SpecialHandlingFlag.TactilePanel,
          SpecialHandlingFlag.TactilePanel, // duplicate
          SpecialHandlingFlag.RaisedFloat
        ]
      })

      const flags = art.getSpecialHandlingFlags()
      expect(flags).toContain(SpecialHandlingFlag.TactilePanel)
      expect(flags).toContain(SpecialHandlingFlag.RaisedFloat)
      expect(flags).toHaveLength(2) // duplicates should be removed by Set
    })
  })

  describe('edge cases', () => {
    it('should handle zero dimensions', () => {
      const art = new Art({
        ...baseArtOptions,
        dimensions: {
          length: 0,
          width: 0,
          height: 0
        }
      })

      const dimensions = art.getDimensions()
      expect(dimensions.length).toBe(0)
      expect(dimensions.width).toBe(0)
      expect(dimensions.height).toBe(0)
    })

    it('should handle very small dimensions', () => {
      const art = new Art({
        ...baseArtOptions,
        dimensions: {
          length: 0.1,
          width: 0.1,
          height: 0.1
        }
      })

      const dimensions = art.getDimensions()
      expect(dimensions.length).toBe(1) // Math.ceil(0.1)
      expect(dimensions.width).toBe(1)  // Math.ceil(0.1)
      expect(dimensions.height).toBe(1) // Math.ceil(0.1)
    })

    it('should handle large quantities', () => {
      const art = new Art({
        ...baseArtOptions,
        quantity: 1000
      })

      expect(art.getQuantity()).toBe(1000)
    })
  })
})
