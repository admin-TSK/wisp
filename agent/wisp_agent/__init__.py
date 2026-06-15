"""Wisp endpoint agent.

A thin, inspectable wrapper around the pinned Headroom proxy. Supervises the
proxy, applies MDM-delivered policy, measures PII-free token counts, serves a
read-only local stats feed for the device UI, and flushes telemetry to the SaaS.
"""

__version__ = "0.1.0"
