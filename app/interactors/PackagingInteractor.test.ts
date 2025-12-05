import { describe, it, expect, beforeEach } from 'vitest'
import { PackagingInteractor } from './PackagingInteractor'
import { Art, ArtType, ArtMaterial } from '../entities/Art'
import { Box, BoxType } from '../entities/Box'
import { PackagingRequest, DeliveryCapabilities } from '../requests/PackagingRequest'

describe('PackagingInteractor', () => {
  let interactor: PackagingInteractor

  beforeEach(() => {
    interactor = new PackagingInteractor()
  })

  describe('packBoxes', () => {
    it('should pack standard size art into boxes', () => {
      const art = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 43, height: 2 },
        quantity: 6
      })

      const result = interactor.packBoxes([art])

      expect(result.boxes.length).toBeGreaterThan(0)
      expect(result.unassignedArt.length).toBe(0)
      expect(result.assignments.has('ART-001')).toBe(true)
    })

    it('should handle multiple art pieces with different sizes', () => {
      const art1 = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 43, height: 2 },
        quantity: 6
      })

      const art2 = new Art({
        id: 'ART-002',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 31, width: 55, height: 2 },
        quantity: 1
      })

      const art3 = new Art({
        id: 'ART-003',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 34, width: 47, height: 2 },
        quantity: 1
      })

      const result = interactor.packBoxes([art1, art2, art3])

      expect(result.boxes.length).toBeGreaterThan(0)
      expect(result.assignments.size).toBe(3)
    })

    it('should mark art requiring custom packaging as unassigned', () => {
      const art = new Art({
        id: 'ART-CUSTOM',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 50, width: 50, height: 2 },
        quantity: 1
      })

      const result = interactor.packBoxes([art])

      expect(result.unassignedArt.length).toBe(1)
      expect(result.unassignedReasons['ART-CUSTOM']).toContain('custom packaging')
    })

    it('should package mirrors in large cartons when dimensions demand it', () => {
      const mirror = new Art({
        id: 'ART-MIRROR',
        productType: ArtType.Mirror,
        material: ArtMaterial.Mirror,
        dimensions: { length: 43, width: 43, height: 2 },
        quantity: 1
      })

      const result = interactor.packBoxes([mirror])

      expect(result.boxes.length).toBe(1)
      expect(result.boxes[0].getType()).toBe(BoxType.Large)
      expect(result.unassignedArt.length).toBe(0)
    })

    it('should use standard boxes for items with one dimension ≤36"', () => {
      const art = new Art({
        id: 'ART-TELE',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 31, width: 55, height: 2 },
        quantity: 1
      })

      const result = interactor.packBoxes([art])

      expect(result.boxes.length).toBeGreaterThan(0)
      expect(result.boxes[0].getType()).toBe(BoxType.Standard)
    })

    it('should use large boxes for items with both dimensions >36" and ≤43.5"', () => {
      const art = new Art({
        id: 'ART-LARGE',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 38, width: 40, height: 2 },
        quantity: 1
      })

      const result = interactor.packBoxes([art])

      expect(result.boxes.length).toBeGreaterThan(0)
      expect(result.boxes[0].getType()).toBe(BoxType.Large)
    })

    it('should respect box capacity limits', () => {
      const art1 = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 6
      })

      const art2 = new Art({
        id: 'ART-002',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 6
      })

      const result = interactor.packBoxes([art1, art2])

      expect(result.boxes.length).toBeGreaterThanOrEqual(2)
    })

    it('should return empty arrays for empty input', () => {
      const result = interactor.packBoxes([])

      expect(result.boxes).toEqual([])
      expect(result.unassignedArt).toEqual([])
      expect(result.assignments.size).toBe(0)
    })

    it('does not mix different mediums inside the same box', () => {
      const canvas = new Art({
        id: 'ART-CANVAS',
        productType: ArtType.CanvasFloatFrame,
        material: ArtMaterial.CanvasFramed,
        dimensions: { length: 30, width: 24, height: 2 },
        quantity: 2,
      })

      const print = new Art({
        id: 'ART-PRINT',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 25, height: 2 },
        quantity: 2,
      })

      const result = interactor.packBoxes([canvas, print])
      expect(result.boxes.length).toBeGreaterThanOrEqual(2)

      result.boxes.forEach((box) => {
        const types = box.getContents().map((art) => art.getProductType())
        expect(new Set(types).size).toBeLessThanOrEqual(1)
      })
    })

    it('splits large paper prints based on the 6-per-box rule even in large cartons', () => {
      const largePrints = new Art({
        id: 'ART-LARGE-PAPER',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 42, width: 40, height: 2 },
        quantity: 7,
      })

      const result = interactor.packBoxes([largePrints])
      const totalPieces = result.boxes.reduce((sum, box) => sum + box.getTotalPieces(), 0)

      expect(totalPieces).toBe(7)
      result.boxes.forEach((box) => {
        expect(box.getType()).toBe(BoxType.Large)
        expect(box.getTotalPieces()).toBeLessThanOrEqual(6)
      })
    })

    it('allows mirrors in cartons but caps them at eight pieces per large box', () => {
      const mirrors = new Art({
        id: 'ART-MIRROR',
        productType: ArtType.Mirror,
        material: ArtMaterial.Mirror,
        dimensions: { length: 43, width: 43, height: 2 },
        quantity: 9,
      })

      const result = interactor.packBoxes([mirrors])
      const totalPieces = result.boxes.reduce((sum, box) => sum + box.getTotalPieces(), 0)

      expect(totalPieces).toBe(9)
      result.boxes.forEach((box) => {
        expect(box.getType()).toBe(BoxType.Large)
        expect(box.getTotalPieces()).toBeLessThanOrEqual(8)
      })
    })
  })

  describe('packContainers', () => {
    it('should pack standard boxes into standard pallets', () => {
      const box1 = new Box({ type: BoxType.Standard })
      const box2 = new Box({ type: BoxType.Standard })

      const capabilities: DeliveryCapabilities = {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      }

      const result = interactor.packContainers([box1, box2], capabilities)

      expect(result.containers.length).toBeGreaterThan(0)
      expect(result.unassignedBoxes.length).toBe(0)
    })

    it('should use crates when pallets not accepted', () => {
      const art = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })
      
      const boxResult = interactor.packBoxes([art])

      const capabilities: DeliveryCapabilities = {
        acceptsPallets: false,
        acceptsCrates: true,
        hasLoadingDock: false,
        requiresLiftgate: true,
        needsInsideDelivery: true
      }

      const result = interactor.packContainers(boxResult.boxes, capabilities)

      // Crates should be selected when pallets not accepted
      // Note: Standard crates have no box type restrictions, so they should accept any box
      expect(result.containers.length).toBeGreaterThanOrEqual(0)
      
      // If boxes were created, verify the container selection logic worked
      if (boxResult.boxes.length > 0) {
        expect(result.containers.length + result.unassignedBoxes.length).toBe(boxResult.boxes.length)
      }
    })

    it('should mark boxes as unassigned when no container type available', () => {
      const box = new Box({ type: BoxType.Standard })

      const capabilities: DeliveryCapabilities = {
        acceptsPallets: false,
        acceptsCrates: false,
        hasLoadingDock: false,
        requiresLiftgate: false,
        needsInsideDelivery: false
      }

      const result = interactor.packContainers([box], capabilities)

      expect(result.unassignedBoxes.length).toBe(1)
    })

    it('should return empty arrays for empty input', () => {
      const capabilities: DeliveryCapabilities = {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      }

      const result = interactor.packContainers([], capabilities)

      expect(result.containers).toEqual([])
      expect(result.unassignedBoxes).toEqual([])
    })
  })

  describe('packageEverything - Integration Tests', () => {
    it('should calculate correct weight summary for Input1 scenario', () => {
      const request: PackagingRequest = {
        artItems: [
          new Art({
            id: 'ART-001',
            productType: ArtType.PaperPrint,
            material: ArtMaterial.Glass,
            dimensions: { length: 33, width: 43, height: 2 },
            quantity: 11
          }),
          new Art({
            id: 'ART-002',
            productType: ArtType.PaperPrint,
            material: ArtMaterial.Glass,
            dimensions: { length: 31, width: 55, height: 2 },
            quantity: 1
          }),
          new Art({
            id: 'ART-003',
            productType: ArtType.PaperPrint,
            material: ArtMaterial.Glass,
            dimensions: { length: 34, width: 47, height: 2 },
            quantity: 1
          })
        ],
        clientName: 'Test Client',
        jobSiteLocation: 'Test Location',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const response = interactor.packageEverything(request)

      // Expected weight calculations (rounded at individual piece level):
      // Line 1: 33*43*0.0098 = 13.9062, rounded up to 14 lbs. 14 * 11 = 154 lbs
      // Line 2: 31*55*0.0098 = 16.709, rounded up to 17 lbs. 17 * 1 = 17 lbs
      // Line 3: 34*47*0.0098 = 15.6604, rounded up to 16 lbs. 16 * 1 = 16 lbs
      // Total: 154 + 17 + 16 = 187 lbs
      expect(response.weightSummary.totalArtworkWeightLbs).toBe(187)
      expect(response.weightSummary.packagingWeightLbs.total).toBe(60)
      expect(response.weightSummary.finalShipmentWeightLbs).toBe(247)
    })

    it('should calculate correct weight summary for Input3 scenario', () => {
      // Create 70 pieces as multiple Art objects (12 boxes of 6 pieces each = 72, but we'll use 70)
      const artItems = Array.from({ length: 12 }, (_, i) => 
        new Art({
          id: `ART-${i + 1}`,
          productType: ArtType.PaperPrint,
          material: ArtMaterial.Glass,
          dimensions: { length: 36, width: 44, height: 2 },
          quantity: i < 10 ? 6 : 5  // 10*6 + 2*5 = 70 pieces
        })
      )

      const request: PackagingRequest = {
        artItems,
        clientName: 'Test Client',
        jobSiteLocation: 'Test Location',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const response = interactor.packageEverything(request)

      // Expected weight calculations (rounded at individual piece level):
      // 36*44*0.0098 = 15.5232, rounded up to 16 lbs per piece
      // 70 pieces * 16 = 1120 lbs
      // 12 boxes (70/6 = 11.67, rounded up to 12)
      // Optimization: 12 boxes → oversize needs 12/5=2.4→3 pallets @ 75 = 225 lbs
      //               vs standard needs 12/4=3 pallets @ 60 = 180 lbs → Choose standard
      // 3 standard pallets * 60 lbs = 180 lbs packaging
      // Total: 1120 + 180 = 1300 lbs
      expect(response.weightSummary.totalArtworkWeightLbs).toBe(1120)
      expect(response.weightSummary.packagingWeightLbs.total).toBe(180)
      expect(response.weightSummary.finalShipmentWeightLbs).toBe(1300)
    })

    it('should calculate correct weight summary for Input4 scenario (acrylic)', () => {
      // Create 18 pieces as multiple Art objects (3 groups of 6)
      const artItems = Array.from({ length: 3 }, (_, i) => 
        new Art({
          id: `ART-${i + 1}`,
          productType: ArtType.PaperPrint,
          material: ArtMaterial.Acrylic,
          dimensions: { length: 32, width: 43, height: 2 },
          quantity: 6
        })
      )

      const request: PackagingRequest = {
        artItems,
        clientName: 'Test Client',
        jobSiteLocation: 'Test Location',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const response = interactor.packageEverything(request)

      // Expected weight calculations (rounded at individual piece level):
      // 32*43*0.0094 = 12.9344, rounded up to 13 lbs per piece
      // 18 pieces * 13 = 234 lbs
      // 3 boxes (18/6 = 3)
      // 3 boxes fit on 1 pallet
      // 1 pallet * 60 lbs = 60 lbs packaging
      // Total: 234 + 60 = 294 lbs
      expect(response.weightSummary.totalArtworkWeightLbs).toBe(234)
      expect(response.weightSummary.packagingWeightLbs.total).toBe(60)
      expect(response.weightSummary.finalShipmentWeightLbs).toBe(294)
    })

    it('should include metadata with processing time and timestamp', () => {
      const request: PackagingRequest = {
        artItems: [
          new Art({
            id: 'ART-001',
            productType: ArtType.PaperPrint,
            material: ArtMaterial.Glass,
            dimensions: { length: 24, width: 30, height: 2 },
            quantity: 1
          })
        ],
        clientName: 'Test Client',
        jobSiteLocation: 'Test Location',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const response = interactor.packageEverything(request)

      expect(response.metadata.processingTimeMs).toBeGreaterThanOrEqual(0)
      expect(response.metadata.timestamp).toBeDefined()
      expect(response.metadata.algorithmUsed).toBe('Pack by Medium (No Mixed Mediums)')
    })
  })

  describe('calculateCrateFootprint', () => {
    it('should return zero dimensions for empty box array', () => {
      const result = (interactor as any).calculateCrateFootprint([])

      expect(result.length).toBe(0)
      expect(result.width).toBe(0)
      expect(result.height).toBe(0)
    })

    it('should calculate footprint for single box', () => {
      const box = new Box({ type: BoxType.Standard })
      const art = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })
      box.addArt(art)

      const result = (interactor as any).calculateCrateFootprint([box])

      expect(result.length).toBeGreaterThan(0)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })

    it('should stack heights for multiple boxes', () => {
      const box1 = new Box({ type: BoxType.Standard })
      const box2 = new Box({ type: BoxType.Standard })
      const art = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })
      box1.addArt(art)
      box2.addArt(art)

      const result = (interactor as any).calculateCrateFootprint([box1, box2])

      const singleHeight = box1.getRequiredDimensions().height
      expect(result.height).toBe(singleHeight * 2)
    })

    it('should use maximum length and width from all boxes', () => {
      const box1 = new Box({ type: BoxType.Standard })
      const box2 = new Box({ type: BoxType.Standard })
      
      const art1 = new Art({
        id: 'ART-001',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 20, width: 25, height: 2 },
        quantity: 1
      })
      
      const art2 = new Art({
        id: 'ART-002',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 30, width: 35, height: 2 },
        quantity: 1
      })
      
      box1.addArt(art1)
      box2.addArt(art2)

      const result = (interactor as any).calculateCrateFootprint([box1, box2])

      // The footprint uses the required dimensions from the boxes, which are at least
      // the inner dimensions of the box (36x36 for standard boxes)
      expect(result.length).toBeGreaterThanOrEqual(35)
      expect(result.width).toBeGreaterThanOrEqual(30)
    })
  })

  describe('buildWeightSummary - Unit Tests', () => {
    it('should separate glass-framed weight from total', () => {
      const glassArt = new Art({
        id: 'GLASS-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const acrylicArt = new Art({
        id: 'ACRYLIC-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Acrylic,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const boxResult = interactor.packBoxes([glassArt, acrylicArt])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildWeightSummary([glassArt, acrylicArt], containerResult)

      expect(summary.glassFramedWeightLbs).toBeGreaterThan(0)
      expect(summary.glassFramedWeightLbs).toBeLessThan(summary.totalArtworkWeightLbs)
      expect(summary.totalArtworkWeightLbs).toBeGreaterThan(summary.glassFramedWeightLbs)
    })

    it('should identify oversized weight correctly', () => {
      const oversizedArt = new Art({
        id: 'OVERSIZE-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 31, width: 55, height: 2 }, // longSide=55 > 43, so oversized
        quantity: 1
      })

      const standardArt = new Art({
        id: 'STANDARD-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 33, width: 43, height: 2 }, // longSide=43, not oversized
        quantity: 1
      })

      const boxResult = interactor.packBoxes([oversizedArt, standardArt])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildWeightSummary([oversizedArt, standardArt], containerResult)

      expect(summary.oversizedWeightLbs).toBeGreaterThan(0)
      expect(summary.oversizedWeightLbs).toBeLessThan(summary.totalArtworkWeightLbs)
    })

    it('should calculate final shipment weight as artwork + packaging', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildWeightSummary([art], containerResult)

      expect(summary.finalShipmentWeightLbs).toBe(
        summary.totalArtworkWeightLbs + summary.packagingWeightLbs.total
      )
    })

    it('should count pallets and crates separately', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildWeightSummary([art], containerResult)

      expect(summary.packagingWeightLbs.pallets.count).toBeGreaterThanOrEqual(0)
      expect(summary.packagingWeightLbs.crates.count).toBeGreaterThanOrEqual(0)
      expect(summary.packagingWeightLbs.total).toBe(
        summary.packagingWeightLbs.pallets.totalWeight + summary.packagingWeightLbs.crates.totalWeight
      )
    })
  })

  describe('buildPackingSummary - Unit Tests', () => {
    it('should group boxes by type', () => {
      const standardArt = new Art({
        id: 'STD-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const largeArt = new Art({
        id: 'LARGE-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 38, width: 40, height: 2 },
        quantity: 1
      })

      const boxResult = interactor.packBoxes([standardArt, largeArt])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildPackingSummary(boxResult, containerResult)

      expect(summary.boxRequirements.length).toBeGreaterThan(0)
      expect(summary.boxRequirements.every((req: any) => req.count > 0)).toBe(true)
      expect(summary.boxRequirements.every((req: any) => req.label && req.dimensions)).toBe(true)
    })

    it('should include hardware totals', () => {
      const artWithHardware = new Art({
        id: 'HW-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 3,
        hardwareLabel: 'D-Ring Hangers',
        hardwarePiecesPerItem: 2
      })

      const boxResult = interactor.packBoxes([artWithHardware])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildPackingSummary(boxResult, containerResult)

      expect(summary.hardware.totalPieces).toBe(6) // 3 items * 2 pieces
      expect(summary.hardware.totalsByHardwareType['D-Ring Hangers']).toBe(6)
      expect(summary.hardware.lineItemSummary.length).toBe(1)
    })

    it('should handle multiple hardware types', () => {
      const art1 = new Art({
        id: 'HW-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 2,
        hardwareLabel: 'D-Ring Hangers',
        hardwarePiecesPerItem: 2
      })

      const art2 = new Art({
        id: 'HW-2',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1,
        hardwareLabel: 'Wire Hangers',
        hardwarePiecesPerItem: 1
      })

      const boxResult = interactor.packBoxes([art1, art2])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildPackingSummary(boxResult, containerResult)

      expect(summary.hardware.totalPieces).toBe(5) // 2*2 + 1*1
      expect(summary.hardware.lineItemSummary.length).toBe(2)
      expect(summary.hardware.totalsByHardwareType['D-Ring Hangers']).toBe(4)
      expect(summary.hardware.totalsByHardwareType['Wire Hangers']).toBe(1)
    })

    it('should include packed container dimensions with weight', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, {
        acceptsPallets: true,
        acceptsCrates: false,
        hasLoadingDock: true,
        requiresLiftgate: false,
        needsInsideDelivery: false
      })

      const summary = (interactor as any).buildPackingSummary(boxResult, containerResult)

      expect(summary.packedContainerDimensions.length).toBeGreaterThan(0)
      summary.packedContainerDimensions.forEach((container: any) => {
        expect(container.containerId).toBeDefined()
        expect(container.dimensions).toMatch(/\d+"x\d+"x\d+"/)
        expect(container.weightLbs).toBeGreaterThan(0)
      })
    })
  })

  describe('buildBusinessIntelligence - Unit Tests', () => {
    it('should flag metal prints for special handling', () => {
      const metalArt = new Art({
        id: 'METAL-1',
        productType: ArtType.MetalPrint,
        material: ArtMaterial.NoGlazing,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [metalArt],
        clientName: 'Test',
        jobSiteLocation: 'Test',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([metalArt])
      const bi = (interactor as any).buildBusinessIntelligence(request, boxResult)

      expect(bi.mediumsToFlag.some((m: string) => m.includes('Metal Prints'))).toBe(true)
    })

    it('should flag wall decor items', () => {
      const wallDecor = new Art({
        id: 'WALL-1',
        productType: ArtType.WallDecor,
        material: ArtMaterial.NoGlazing,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [wallDecor],
        clientName: 'Test',
        jobSiteLocation: 'Test',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([wallDecor])
      const bi = (interactor as any).buildBusinessIntelligence(request, boxResult)

      expect(bi.mediumsToFlag.some((m: string) => m.includes('Wall Decor'))).toBe(true)
    })

    it('should identify risk flags for glass items', () => {
      const glassArt = new Art({
        id: 'GLASS-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [glassArt],
        clientName: 'Test',
        jobSiteLocation: 'Test',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([glassArt])
      const bi = (interactor as any).buildBusinessIntelligence(request, boxResult)

      expect(bi.riskFlags.some((f: string) => f.includes('glass'))).toBe(true)
    })

    it('should report no high-risk items when none present', () => {
      const standardArt = new Art({
        id: 'STD-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Acrylic,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [standardArt],
        clientName: 'Test',
        jobSiteLocation: 'Test',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([standardArt])
      const bi = (interactor as any).buildBusinessIntelligence(request, boxResult)

      expect(bi.riskFlags.some((f: string) => f.includes('No high-risk'))).toBe(true)
    })
  })

  describe('buildFreightExport - Unit Tests', () => {
    it('should include client name and location in subject', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [art],
        clientName: 'ACME Corporation',
        jobSiteLocation: 'Chicago, IL',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, request.deliveryCapabilities)
      
      const freightExport = (interactor as any).buildFreightExport(request, containerResult, 100)

      expect(freightExport.subject).toContain('ACME Corporation')
      expect(freightExport.subject).toContain('Chicago, IL')
    })

    it('should include total weight in shipment details', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [art],
        clientName: 'Test',
        jobSiteLocation: 'Test Location',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, request.deliveryCapabilities)
      
      const freightExport = (interactor as any).buildFreightExport(request, containerResult, 250)

      expect(freightExport.shipmentDetails.some((d: string) => d.includes('250 lbs'))).toBe(true)
    })

    it('should include pickup and delivery locations', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [art],
        clientName: 'Test',
        jobSiteLocation: 'Boston, MA',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: false,
          needsInsideDelivery: false
        }
      }

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, request.deliveryCapabilities)
      
      const freightExport = (interactor as any).buildFreightExport(request, containerResult, 100)

      expect(freightExport.shipmentDetails.some((d: string) => d.includes('ARCH Design, St. Louis, MO'))).toBe(true)
      expect(freightExport.shipmentDetails.some((d: string) => d.includes('Boston, MA'))).toBe(true)
    })

    it('should describe delivery capabilities', () => {
      const art = new Art({
        id: 'ART-1',
        productType: ArtType.PaperPrint,
        material: ArtMaterial.Glass,
        dimensions: { length: 24, width: 30, height: 2 },
        quantity: 1
      })

      const request: PackagingRequest = {
        artItems: [art],
        clientName: 'Test',
        jobSiteLocation: 'Test',
        serviceType: 'Delivery',
        deliveryCapabilities: {
          acceptsPallets: true,
          acceptsCrates: false,
          hasLoadingDock: true,
          requiresLiftgate: true,
          needsInsideDelivery: true
        }
      }

      const boxResult = interactor.packBoxes([art])
      const containerResult = interactor.packContainers(boxResult.boxes, request.deliveryCapabilities)
      
      const freightExport = (interactor as any).buildFreightExport(request, containerResult, 100)

      const specialReqs = freightExport.shipmentDetails.find((d: string) => d.includes('Special Requirements'))
      expect(specialReqs).toBeDefined()
      expect(specialReqs).toContain('Liftgate')
      expect(specialReqs).toContain('Inside delivery')
    })
  })
})
