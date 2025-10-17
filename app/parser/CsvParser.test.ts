import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parse, parseWithDiagnostics, validateCsvStructure, type ParseResult, type ParseError } from './CsvParser'
import { Art, ArtType, ArtMaterial } from '../entities/Art'

// Mock fs modules
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn()
}))

vi.mock('node:fs', () => ({
  createReadStream: vi.fn()
}))

vi.mock('csv-parser', () => ({
  default: vi.fn()
}))

describe('CsvParser', () => {
  let mockReadFile: any
  let mockCreateReadStream: any
  let mockCsvParse: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockReadFile = vi.mocked((await import('node:fs/promises')).readFile)
    mockCreateReadStream = vi.mocked((await import('node:fs')).createReadStream)
    mockCsvParse = vi.mocked((await import('csv-parser')).default)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('parse', () => {
    it('should parse valid CSV file and return Art items', async () => {
      const csvFilePath = 'test.csv'
      const mockArtItems = [
        new Art({
          id: '1',
          productType: ArtType.PaperPrint,
          material: ArtMaterial.Glass,
          dimensions: { length: 45.375, width: 31.375 },
          quantity: 1,
          description: 'Paper Print - Framed',
          finalMediumLabel: 'Paper Print - Framed',
          glazingLabel: 'Regular Glass',
          hardwareLabel: '4 pt Sec',
          hardwarePiecesPerItem: 4
        })
      ]

      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      mockCsvParse.mockReturnValue(mockStream as any)

      // Mock the stream events
      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          // Simulate valid CSV row
          callback({
            lineNumber: '1',
            quantity: '1',
            tagNumber: '1',
            finalMedium: 'Paper Print - Framed',
            outsideWidth: '31.3750',
            outsideHeight: '45.3750',
            glazing: 'Regular Glass',
            frameMoulding: '475130-BX',
            hardware: '4 pt Sec'
          })
        } else if (event === 'end') {
          callback()
        }
        return mockStream
      })

      const result = await parse(csvFilePath)

      expect(result).toHaveLength(1)
      expect(result[0].getProductType()).toBe(ArtType.PaperPrint)
      expect(result[0].getMaterial()).toBe(ArtMaterial.Glass)
      expect(mockReadFile).toHaveBeenCalledWith(csvFilePath, 'utf8')
    })

    it('should handle parsing errors and log them to stderr', async () => {
      const csvFilePath = 'test.csv'
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      mockCsvParse.mockReturnValue(mockStream as any)

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          // Simulate invalid CSV row
          callback({
            lineNumber: '1',
            quantity: '1',
            // Missing required fields
          })
        } else if (event === 'end') {
          callback()
        }
        return mockStream
      })

      const result = await parse(csvFilePath)

      expect(result).toHaveLength(0)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CSV parsing completed with'))
      
      consoleSpy.mockRestore()
    })

    it('should throw error when file cannot be accessed', async () => {
      const csvFilePath = 'nonexistent.csv'
      const fileError = new Error('ENOENT: no such file or directory')
      mockReadFile.mockRejectedValue(fileError)

      await expect(parse(csvFilePath)).rejects.toThrow('Cannot access CSV file')
    })
  })

  describe('parseWithDiagnostics', () => {
    it('should return detailed parsing results with valid data', async () => {
      const csvFilePath = 'test.csv'
      
      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      mockCsvParse.mockReturnValue(mockStream as any)

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callback({
            lineNumber: '1',
            quantity: '1',
            tagNumber: '1',
            finalMedium: 'Paper Print - Framed',
            outsideWidth: '31.3750',
            outsideHeight: '45.3750',
            glazing: 'Regular Glass',
            frameMoulding: '475130-BX',
            hardware: '4 pt Sec'
          })
        } else if (event === 'end') {
          callback()
        }
        return mockStream
      })

      const result = await parseWithDiagnostics(csvFilePath)

      expect(result.artItems).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
      expect(result.totalRows).toBe(1)
      expect(result.validRows).toBe(1)
    })

    it('should return detailed parsing results with errors', async () => {
      const csvFilePath = 'test.csv'
      
      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      mockCsvParse.mockReturnValue(mockStream as any)

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          // First row - valid
          callback({
            lineNumber: '1',
            quantity: '1',
            tagNumber: '1',
            finalMedium: 'Paper Print - Framed',
            outsideWidth: '31.3750',
            outsideHeight: '45.3750',
            glazing: 'Regular Glass',
            frameMoulding: '475130-BX',
            hardware: '4 pt Sec'
          })
          // Second row - invalid (missing required fields)
          callback({
            lineNumber: '2',
            quantity: '1'
            // Missing other required fields
          })
        } else if (event === 'end') {
          callback()
        }
        return mockStream
      })

      const result = await parseWithDiagnostics(csvFilePath)

      expect(result.artItems).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.totalRows).toBe(2)
      expect(result.validRows).toBe(1)
      expect(result.errors[0].row).toBe(2)
      expect(result.errors[0].error).toContain('Missing required columns')
    })

    it('should handle stream errors', async () => {
      const csvFilePath = 'test.csv'
      const streamError = new Error('Stream error')
      
      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      mockCsvParse.mockReturnValue(mockStream as any)

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(streamError)
        }
        return mockStream
      })

      await expect(parseWithDiagnostics(csvFilePath)).rejects.toThrow('CSV parsing failed')
    })

    it('should handle ArtTranslator errors', async () => {
      const csvFilePath = 'test.csv'
      
      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      mockCsvParse.mockReturnValue(mockStream as any)

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          // Row with invalid final medium
          callback({
            lineNumber: '1',
            quantity: '1',
            tagNumber: '1',
            finalMedium: 'Invalid Medium',
            outsideWidth: '31.3750',
            outsideHeight: '45.3750',
            glazing: 'Regular Glass',
            frameMoulding: '475130-BX',
            hardware: '4 pt Sec'
          })
        } else if (event === 'end') {
          callback()
        }
        return mockStream
      })

      const result = await parseWithDiagnostics(csvFilePath)

      expect(result.artItems).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('Unknown final medium')
    })
  })

  describe('validateCsvStructure', () => {
    it('should validate CSV structure with all required columns', async () => {
      const csvFilePath = 'test.csv'
      const validHeader = 'Line Number,Quantity,Tag #,Final Medium,Outside Size Width,Outside Size Height,Glazing,Frame 1 Moulding,Hardware'
      
      mockReadFile.mockResolvedValue(validHeader)

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.headers).toEqual([
        'Line Number', 'Quantity', 'Tag #', 'Final Medium', 
        'Outside Size Width', 'Outside Size Height', 'Glazing', 
        'Frame 1 Moulding', 'Hardware'
      ])
    })

    it('should detect missing required columns', async () => {
      const csvFilePath = 'test.csv'
      const invalidHeader = 'Line Number,Quantity,Tag #,Final Medium'
      
      mockReadFile.mockResolvedValue(invalidHeader)

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Missing required columns')
    })

    it('should handle quoted headers', async () => {
      const csvFilePath = 'test.csv'
      const quotedHeader = '"Line Number","Quantity","Tag #","Final Medium","Outside Size Width","Outside Size Height","Glazing","Frame 1 Moulding","Hardware"'
      
      mockReadFile.mockResolvedValue(quotedHeader)

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle case variations in headers', async () => {
      const csvFilePath = 'test.csv'
      const caseVariationHeader = 'line number,QUANTITY,tag #,final medium,OUTSIDE SIZE WIDTH,outside size height,GLAZING,frame 1 moulding,HARDWARE'
      
      mockReadFile.mockResolvedValue(caseVariationHeader)

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle file read errors', async () => {
      const csvFilePath = 'nonexistent.csv'
      const fileError = new Error('ENOENT: no such file or directory')
      mockReadFile.mockRejectedValue(fileError)

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Cannot read CSV file')
    })

    it('should handle empty CSV file', async () => {
      const csvFilePath = 'empty.csv'
      mockReadFile.mockResolvedValue('')

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Missing required columns')
    })

    it('should handle CSV with extra columns', async () => {
      const csvFilePath = 'test.csv'
      const extraColumnsHeader = 'Line Number,Quantity,Tag #,Final Medium,Outside Size Width,Outside Size Height,Glazing,Frame 1 Moulding,Hardware,Extra Column,Another Extra'
      
      mockReadFile.mockResolvedValue(extraColumnsHeader)

      const result = await validateCsvStructure(csvFilePath)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.headers).toHaveLength(11)
    })
  })

  describe('header mapping', () => {
    it('should correctly map header aliases', async () => {
      const csvFilePath = 'test.csv'
      
      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      
      let mapHeadersCallback: Function | null = null
      mockCsvParse.mockImplementation((options: any) => {
        mapHeadersCallback = options.mapHeaders
        return mockStream
      })

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          callback({
            lineNumber: '1',
            quantity: '1',
            tagNumber: '1',
            finalMedium: 'Paper Print - Framed',
            outsideWidth: '31.3750',
            outsideHeight: '45.3750',
            glazing: 'Regular Glass',
            frameMoulding: '475130-BX',
            hardware: '4 pt Sec'
          })
        } else if (event === 'end') {
          callback()
        }
        return mockStream
      })

      await parseWithDiagnostics(csvFilePath)

      // Test header mapping
      expect(mapHeadersCallback).toBeDefined()
      expect(mapHeadersCallback({ header: 'line number' })).toBe('lineNumber')
      expect(mapHeadersCallback({ header: 'tag #' })).toBe('tagNumber')
      expect(mapHeadersCallback({ header: 'final medium' })).toBe('finalMedium')
      expect(mapHeadersCallback({ header: 'outside size width' })).toBe('outsideWidth')
      expect(mapHeadersCallback({ header: 'outside size height' })).toBe('outsideHeight')
      expect(mapHeadersCallback({ header: 'frame 1 moulding' })).toBe('frameMoulding')
    })

    it('should handle headers with quotes and special characters', async () => {
      const csvFilePath = 'test.csv'
      
      mockReadFile.mockResolvedValue('header,data')
      
      const mockStream = {
        pipe: vi.fn().mockReturnThis(),
        on: vi.fn()
      }
      mockCreateReadStream.mockReturnValue(mockStream as any)
      
      let mapHeadersCallback: Function | null = null
      mockCsvParse.mockImplementation((options: any) => {
        mapHeadersCallback = options.mapHeaders
        return mockStream
      })

      const onCall = mockStream.on as any
      onCall.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          callback()
        }
        return mockStream
      })

      await parseWithDiagnostics(csvFilePath)

      expect(mapHeadersCallback).toBeDefined()
      expect(mapHeadersCallback({ header: '"line number"' })).toBe('lineNumber')
      expect(mapHeadersCallback({ header: '  line number  ' })).toBe('lineNumber')
      expect(mapHeadersCallback({ header: 'tag #' })).toBe('tagNumber')
    })
  })
})
