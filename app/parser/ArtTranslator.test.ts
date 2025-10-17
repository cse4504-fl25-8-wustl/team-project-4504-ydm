import { describe, it, expect, vi } from 'vitest'
import { ArtTranslator } from './ArtTranslator'
import { Art, ArtType, ArtMaterial } from '../entities/Art'

describe('ArtTranslator', () => {
  describe('fromCsvRow', () => {
    const baseCsvRow = {
      lineNumber: '1',
      quantity: '1',
      tagNumber: '1',
      finalMedium: 'Paper Print - Framed',
      outsideWidth: '31.3750',
      outsideHeight: '45.3750',
      glazing: 'Regular Glass',
      frameMoulding: '475130-BX',
      hardware: '4 pt Sec'
    }

    it('should create Art instance from valid CSV row', () => {
      const art = ArtTranslator.fromCsvRow(baseCsvRow)

      expect(art.getId()).toBe('1')
      expect(art.getProductType()).toBe(ArtType.PaperPrint)
      expect(art.getMaterial()).toBe(ArtMaterial.Glass)
      expect(art.getQuantity()).toBe(1)
      expect(art.getFinalMediumLabel()).toBe('Paper Print - Framed')
      expect(art.getGlazingLabel()).toBe('Regular Glass')
      expect(art.getHardwareLabel()).toBe('4 pt Sec')
      expect(art.getHardwarePiecesPerItem()).toBe(4)
      
      const dimensions = art.getRawDimensions()
      expect(dimensions.length).toBe(45.375) // max of width/height
      expect(dimensions.width).toBe(31.375)  // min of width/height
    })

    it('should handle different final medium types', () => {
      const testCases = [
        {
          finalMedium: 'Canvas - Float Frame',
          expectedType: ArtType.CanvasFloatFrame,
          expectedMaterial: ArtMaterial.CanvasFramed
        },
        {
          finalMedium: 'Canvas - Gallery',
          expectedType: ArtType.CanvasFloatFrame,
          expectedMaterial: ArtMaterial.CanvasGallery
        },
        {
          finalMedium: 'Print - Framed with Title Plate',
          expectedType: ArtType.PaperPrintWithTitlePlate,
          expectedMaterial: ArtMaterial.Glass
        },
        {
          finalMedium: 'Wall Décor',
          expectedType: ArtType.WallDecor,
          expectedMaterial: ArtMaterial.Unknown
        },
        {
          finalMedium: 'Metal Print',
          expectedType: ArtType.MetalPrint,
          expectedMaterial: ArtMaterial.Acrylic
        },
        {
          finalMedium: 'Mirror',
          expectedType: ArtType.Mirror,
          expectedMaterial: ArtMaterial.Mirror
        },
        {
          finalMedium: 'Acoustic Panel',
          expectedType: ArtType.AcousticPanel,
          expectedMaterial: ArtMaterial.AcousticPanel
        },
        {
          finalMedium: 'Acoustic Panel - Framed',
          expectedType: ArtType.AcousticPanelFramed,
          expectedMaterial: ArtMaterial.AcousticPanelFramed
        },
        {
          finalMedium: 'Patient Board',
          expectedType: ArtType.PatientBoard,
          expectedMaterial: ArtMaterial.PatientBoard
        }
      ]

      testCases.forEach(({ finalMedium, expectedType, expectedMaterial }) => {
        const csvRow = { ...baseCsvRow, finalMedium, glazing: '' } // Clear glazing to use medium material
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getProductType()).toBe(expectedType)
        expect(art.getMaterial()).toBe(expectedMaterial)
      })
    })

    it('should handle different glazing types', () => {
      const testCases = [
        { glazing: 'Regular Glass', expectedMaterial: ArtMaterial.Glass },
        { glazing: 'glass', expectedMaterial: ArtMaterial.Glass },
        { glazing: 'Acrylic', expectedMaterial: ArtMaterial.Acrylic },
        { glazing: '', expectedMaterial: ArtMaterial.Glass }, // defaults to medium material
        { glazing: undefined, expectedMaterial: ArtMaterial.Glass }
      ]

      testCases.forEach(({ glazing, expectedMaterial }) => {
        const csvRow = { ...baseCsvRow, glazing }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getMaterial()).toBe(expectedMaterial)
      })
    })

    it('should handle case-insensitive final medium', () => {
      const testCases = [
        'paper print - framed',
        'PAPER PRINT - FRAMED',
        'Paper Print - Framed',
        'PAPER PRINT - FRAMED'
      ]

      testCases.forEach(finalMedium => {
        const csvRow = { ...baseCsvRow, finalMedium }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getProductType()).toBe(ArtType.PaperPrint)
      })
    })

    it('should handle case-insensitive glazing', () => {
      const testCases = [
        'regular glass',
        'REGULAR GLASS',
        'Regular Glass',
        'REGULAR GLASS'
      ]

      testCases.forEach(glazing => {
        const csvRow = { ...baseCsvRow, glazing }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getMaterial()).toBe(ArtMaterial.Glass)
      })
    })

    it('should handle accented characters in final medium', () => {
      const csvRow = { ...baseCsvRow, finalMedium: 'Wall Décor' }
      const art = ArtTranslator.fromCsvRow(csvRow)
      
      expect(art.getProductType()).toBe(ArtType.WallDecor)
    })

    it('should handle different quantity values', () => {
      const testCases = [
        { quantity: '1', expected: 1 },
        { quantity: '5', expected: 5 },
        { quantity: '0', expected: 1 }, // defaults to 1
        { quantity: '-1', expected: 1 }, // defaults to 1
        { quantity: 'invalid', expected: 1 }, // defaults to 1
        { quantity: '', expected: 1 }, // defaults to 1
        { quantity: undefined, expected: 1 } // defaults to 1
      ]

      testCases.forEach(({ quantity, expected }) => {
        const csvRow = { ...baseCsvRow, quantity }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getQuantity()).toBe(expected)
      })
    })

    it('should handle different hardware formats', () => {
      const testCases = [
        { hardware: '4 pt Sec', expected: 4 },
        { hardware: '3 pt Sec', expected: 3 },
        { hardware: '2 pt Sec', expected: 2 },
        { hardware: '1 pt Sec', expected: 1 },
        { hardware: '10 pt Sec', expected: 10 },
        { hardware: '0 pt Sec', expected: 0 },
        { hardware: 'pt Sec', expected: undefined }, // no number
        { hardware: 'invalid', expected: undefined },
        { hardware: '', expected: undefined },
        { hardware: undefined, expected: undefined }
      ]

      testCases.forEach(({ hardware, expected }) => {
        const csvRow = { ...baseCsvRow, hardware }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getHardwarePiecesPerItem()).toBe(expected)
      })
    })

    it('should handle dimension variations', () => {
      const testCases = [
        { outsideWidth: '24.0', outsideHeight: '36.0', expectedLength: 36.0, expectedWidth: 24.0 },
        { outsideWidth: '36.0', outsideHeight: '24.0', expectedLength: 36.0, expectedWidth: 24.0 },
        { outsideWidth: '31.3750', outsideHeight: '45.3750', expectedLength: 45.375, expectedWidth: 31.375 },
        { outsideWidth: '0', outsideHeight: '0', expectedLength: 0, expectedWidth: 0 }
      ]

      testCases.forEach(({ outsideWidth, outsideHeight, expectedLength, expectedWidth }) => {
        const csvRow = { ...baseCsvRow, outsideWidth, outsideHeight }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        const dimensions = art.getRawDimensions()
        expect(dimensions.length).toBe(expectedLength)
        expect(dimensions.width).toBe(expectedWidth)
      })
    })

    it('should handle alternative column names', () => {
      const csvRow = {
        lineNumber: '1',
        quantity: '1',
        tagNumber: '1',
        finalMedium: 'Paper Print - Framed',
        width: '31.3750', // alternative to outsideWidth
        length: '45.3750', // alternative to outsideHeight
        glazing: 'Regular Glass',
        frameMoulding: '475130-BX',
        hardware: '4 pt Sec'
      }

      const art = ArtTranslator.fromCsvRow(csvRow)
      
      const dimensions = art.getRawDimensions()
      expect(dimensions.length).toBe(45.375)
      expect(dimensions.width).toBe(31.375)
    })

    it('should generate appropriate ID from available fields', () => {
      const testCases = [
        { tagNumber: 'TAG-001', lineNumber: '1', expectedId: 'TAG-001' },
        { tagNumber: '', lineNumber: '1', expectedId: '1' },
        { tagNumber: undefined, lineNumber: '1', expectedId: '1' },
        { tagNumber: '', lineNumber: '', finalMedium: 'Paper Print - Framed', expectedId: 'Paper Print - Framed' } // fallback to finalMedium
      ]

      testCases.forEach(({ tagNumber, lineNumber, finalMedium, expectedId }) => {
        const csvRow = { ...baseCsvRow, tagNumber, lineNumber }
        if (finalMedium !== undefined) {
          csvRow.finalMedium = finalMedium
        }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getId()).toBe(expectedId)
      })
    })

    it('should throw error for unknown final medium', () => {
      const csvRow = { ...baseCsvRow, finalMedium: 'Unknown Medium' }
      
      expect(() => ArtTranslator.fromCsvRow(csvRow)).toThrow('Unknown final medium')
    })

    it('should throw error for invalid dimensions', () => {
      const testCases = [
        { outsideWidth: 'invalid', outsideHeight: '45.3750' },
        { outsideWidth: '31.3750', outsideHeight: 'invalid' },
        { outsideWidth: 'NaN', outsideHeight: '45.3750' },
        { outsideWidth: '31.3750', outsideHeight: 'NaN' }
      ]

      testCases.forEach(({ outsideWidth, outsideHeight }) => {
        const csvRow = { ...baseCsvRow, outsideWidth, outsideHeight }
        
        expect(() => ArtTranslator.fromCsvRow(csvRow)).toThrow('Invalid dimensions')
      })
    })

    it('should handle whitespace in all fields', () => {
      const csvRow = {
        lineNumber: '  1  ',
        quantity: '  1  ',
        tagNumber: '  1  ',
        finalMedium: '  Paper Print - Framed  ',
        outsideWidth: '  31.3750  ',
        outsideHeight: '  45.3750  ',
        glazing: '  Regular Glass  ',
        frameMoulding: '  475130-BX  ',
        hardware: '  4 pt Sec  '
      }

      const art = ArtTranslator.fromCsvRow(csvRow)
      
      expect(art.getId()).toBe('  1  ')
      expect(art.getQuantity()).toBe(1)
      expect(art.getProductType()).toBe(ArtType.PaperPrint)
      expect(art.getMaterial()).toBe(ArtMaterial.Glass)
      expect(art.getFinalMediumLabel()).toBe('  Paper Print - Framed  ')
      expect(art.getGlazingLabel()).toBe('  Regular Glass  ')
      expect(art.getHardwareLabel()).toBe('4 pt Sec')
      expect(art.getHardwarePiecesPerItem()).toBe(4)
    })

    it('should handle special characters in hardware', () => {
      const testCases = [
        { hardware: '4 pt Sec', expected: 4 },
        { hardware: '4pt Sec', expected: 4 },
        { hardware: '4-pt Sec', expected: 4 },
        { hardware: '4.pt Sec', expected: 4 },
        { hardware: '4_pt Sec', expected: 4 },
        { hardware: '4 pt', expected: 4 },
        { hardware: '4', expected: 4 }
      ]

      testCases.forEach(({ hardware, expected }) => {
        const csvRow = { ...baseCsvRow, hardware }
        const art = ArtTranslator.fromCsvRow(csvRow)
        
        expect(art.getHardwarePiecesPerItem()).toBe(expected)
      })
    })
  })

  describe('normalizeLabel', () => {
    it('should normalize labels correctly', () => {
      // Access private method through any type for testing
      const translator = ArtTranslator as any
      
      expect(translator.normalizeLabel('  Paper Print - Framed  ')).toBe('paper print - framed')
      expect(translator.normalizeLabel('PAPER PRINT - FRAMED')).toBe('paper print - framed')
      expect(translator.normalizeLabel('Wall Décor')).toBe('wall decor')
      expect(translator.normalizeLabel('')).toBe('')
      expect(translator.normalizeLabel(undefined)).toBe('')
      expect(translator.normalizeLabel('  ')).toBe('')
    })

    it('should handle accented characters', () => {
      const translator = ArtTranslator as any
      
      expect(translator.normalizeLabel('Wall Décor')).toBe('wall decor')
      expect(translator.normalizeLabel('Café')).toBe('cafe')
      expect(translator.normalizeLabel('naïve')).toBe('naive')
    })
  })

  describe('parseHardwarePieces', () => {
    it('should parse hardware pieces correctly', () => {
      // Access private method through any type for testing
      const translator = ArtTranslator as any
      
      expect(translator.parseHardwarePieces('4 pt Sec')).toBe(4)
      expect(translator.parseHardwarePieces('3 pt Sec')).toBe(3)
      expect(translator.parseHardwarePieces('10 pt Sec')).toBe(10)
      expect(translator.parseHardwarePieces('0 pt Sec')).toBe(0)
      expect(translator.parseHardwarePieces('pt Sec')).toBe(undefined)
      expect(translator.parseHardwarePieces('invalid')).toBe(undefined)
      expect(translator.parseHardwarePieces('')).toBe(undefined)
      expect(translator.parseHardwarePieces(undefined)).toBe(undefined)
      expect(translator.parseHardwarePieces('  ')).toBe(undefined)
    })

    it('should handle edge cases in hardware parsing', () => {
      const translator = ArtTranslator as any
      
      expect(translator.parseHardwarePieces('4pt Sec')).toBe(4)
      expect(translator.parseHardwarePieces('4-pt Sec')).toBe(4)
      expect(translator.parseHardwarePieces('4.pt Sec')).toBe(4)
      expect(translator.parseHardwarePieces('4_pt Sec')).toBe(4)
      expect(translator.parseHardwarePieces('4 pt')).toBe(4)
      expect(translator.parseHardwarePieces('4')).toBe(4)
      expect(translator.parseHardwarePieces('  4 pt Sec  ')).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('should handle very large dimensions', () => {
      const csvRow = {
        lineNumber: '1',
        quantity: '1',
        tagNumber: '1',
        finalMedium: 'Paper Print - Framed',
        outsideWidth: '999.9999',
        outsideHeight: '888.8888',
        glazing: 'Regular Glass',
        frameMoulding: '475130-BX',
        hardware: '4 pt Sec'
      }

      const art = ArtTranslator.fromCsvRow(csvRow)
      
      const dimensions = art.getRawDimensions()
      expect(dimensions.length).toBe(999.9999)
      expect(dimensions.width).toBe(888.8888)
    })

    it('should handle very small dimensions', () => {
      const csvRow = {
        lineNumber: '1',
        quantity: '1',
        tagNumber: '1',
        finalMedium: 'Paper Print - Framed',
        outsideWidth: '0.0001',
        outsideHeight: '0.0002',
        glazing: 'Regular Glass',
        frameMoulding: '475130-BX',
        hardware: '4 pt Sec'
      }

      const art = ArtTranslator.fromCsvRow(csvRow)
      
      const dimensions = art.getRawDimensions()
      expect(dimensions.length).toBe(0.0002)
      expect(dimensions.width).toBe(0.0001)
    })

    it('should handle large quantities', () => {
      const csvRow = {
        lineNumber: '1',
        quantity: '1000',
        tagNumber: '1',
        finalMedium: 'Paper Print - Framed',
        outsideWidth: '31.3750',
        outsideHeight: '45.3750',
        glazing: 'Regular Glass',
        frameMoulding: '475130-BX',
        hardware: '4 pt Sec'
      }
      const art = ArtTranslator.fromCsvRow(csvRow)
      
      expect(art.getQuantity()).toBe(1000)
    })

    it('should handle large hardware piece counts', () => {
      const csvRow = {
        lineNumber: '1',
        quantity: '1',
        tagNumber: '1',
        finalMedium: 'Paper Print - Framed',
        outsideWidth: '31.3750',
        outsideHeight: '45.3750',
        glazing: 'Regular Glass',
        frameMoulding: '475130-BX',
        hardware: '100 pt Sec'
      }
      const art = ArtTranslator.fromCsvRow(csvRow)
      
      expect(art.getHardwarePiecesPerItem()).toBe(100)
    })
  })
})
