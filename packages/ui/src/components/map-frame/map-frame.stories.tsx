/**
 * MapFrame — DS-Patterns → Display «Map block» (location preview, results with controls, disabled until an address);
 * B-Onboarding's address step and B-Settings' address move the pin. The stories draw the ground only (Storybook sets
 * `<MapTiles style={null}>`), so they stay offline and the same on every run; `WithTiles` loads OpenFreeMap. Stories
 * are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { MapDot, MapFrame, MapMarker, MapPin, MapPinHandle, MapTiles, OPENFREEMAP_STYLE } from './map-frame'
import type { LatLng } from './projection'

const ashgabat: LatLng = { lat: 37.9375, lng: 58.38 }
const controls = { zoomIn: 'Zoom in', zoomOut: 'Zoom out' }

const meta = {
  title: 'Display/MapFrame',
  component: MapFrame,
  args: { center: ashgabat },
  decorators: [(Story) => <div className="max-w-160">{Story()}</div>],
} satisfies Meta<typeof MapFrame>
export default meta
type Story = StoryObj<typeof meta>

/** The location preview: the business's raised ink pin over its dot. */
export const Preview: Story = {
  args: { interactive: false },
  render: (args) => (
    <MapFrame {...args}>
      <MapMarker at={ashgabat}>
        <MapDot />
        <MapPin hot className="bottom-2.5">
          Glow Studio
        </MapPin>
      </MapMarker>
    </MapFrame>
  ),
}

/** Results: time pins, the chosen one hot, and the zoom buttons. */
export const Results: Story = {
  args: { controls },
  render: (args) => (
    <MapFrame {...args}>
      <MapMarker at={{ lat: 37.9385, lng: 58.3775 }}>
        <MapPin>14:30</MapPin>
      </MapMarker>
      <MapMarker at={{ lat: 37.937, lng: 58.3805 }}>
        <MapPin hot>15:00</MapPin>
      </MapMarker>
      <MapMarker at={{ lat: 37.9392, lng: 58.3822 }}>
        <MapPin>16:15</MapPin>
      </MapMarker>
    </MapFrame>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Zoom in' })).toBeVisible()
    await expect(await canvas.findByText('15:00')).toBeVisible()
  },
}

/** Waiting for an address: the veil and its prompt; no pin. */
export const Disabled: Story = {
  args: { overlay: 'Pick the address first', controls, className: 'h-35' },
  render: (args) => (
    <MapFrame {...args}>
      <MapPinHandle at={ashgabat} onMove={fn()} label="Pin on the map. Move it with the arrow keys" />
    </MapFrame>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Pick the address first')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /Pin on the map/ })).toBeNull()
  },
}

function Draggable({ area = false, onMove }: { area?: boolean; onMove: (at: LatLng) => void }) {
  const [pin, setPin] = useState(ashgabat)
  const move = (at: LatLng) => {
    setPin(at)
    onMove(at)
  }
  return (
    <MapFrame center={ashgabat} controls={controls} onMapClick={move} className="h-80 rounded-card">
      <MapPinHandle at={pin} onMove={move} area={area} label="Pin on the map. Move it with the arrow keys" />
    </MapFrame>
  )
}

/** B-Onboarding's address step: the pin moves with a drag, a tap on the map, or the arrow keys. */
export const DraggablePin: Story = {
  args: { onMapClick: fn() },
  render: (args) => <Draggable onMove={args.onMapClick!} />,
  play: async ({ canvas, args }) => {
    const pin = await canvas.findByRole('button', { name: 'Pin on the map. Move it with the arrow keys' })
    pin.focus()
    await userEvent.keyboard('{ArrowRight}')
    const moved = (args.onMapClick as ReturnType<typeof fn>).mock.lastCall?.[0] as LatLng
    await expect(moved.lng).toBeGreaterThan(ashgabat.lng)
    await expect(moved.lat).toBeCloseTo(ashgabat.lat, 6)
    await userEvent.keyboard('{ArrowUp}')
    const up = (args.onMapClick as ReturnType<typeof fn>).mock.lastCall?.[0] as LatLng
    await expect(up.lat).toBeGreaterThan(ashgabat.lat)
  },
}

/** Home-based: the approximate area instead of the pin, moved the same way. */
export const Area: Story = {
  args: { onMapClick: fn() },
  render: (args) => <Draggable area onMove={args.onMapClick!} />,
  play: async ({ canvas, args }) => {
    const area = await canvas.findByRole('button', { name: 'Pin on the map. Move it with the arrow keys' })
    area.focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect(args.onMapClick).toHaveBeenCalled()
  },
}

/** The real tiles from OpenFreeMap (not run as a test: it needs the network). */
export const WithTiles: Story = {
  tags: ['!test'],
  decorators: [(Story) => <MapTiles style={OPENFREEMAP_STYLE}>{Story()}</MapTiles>],
  render: () => <Draggable onMove={fn()} />,
}
