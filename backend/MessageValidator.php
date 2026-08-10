<?php
namespace SmartWhiteboard;

class MessageValidator {
    public function validate(string $rawMessage): ?array {
        if (strlen($rawMessage) > 1048576) { // 1MB limit
            return null;
        }

        $msg = json_decode($rawMessage, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($msg) || !isset($msg['type']) || !is_string($msg['type'])) {
            return null;
        }

        switch ($msg['type']) {
            case 'register_pc':
                // PC identifies itself explicitly over the WebSocket.
                return ['type' => 'register_pc'];
            case 'join_session':
                if (isset($msg['session_id'], $msg['role']) && is_string($msg['session_id']) && is_string($msg['role'])) {
                    if (preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/', $msg['session_id']) && $msg['role'] === 'mobile') {
                        return $msg;
                    }
                }
                break;
            case 'stroke_start':
                if (isset($msg['id'], $msg['color'], $msg['width']) && is_string($msg['id']) && is_string($msg['color']) && is_numeric($msg['width'])) {
                    $msg['id'] = $this->sanitizeString($msg['id']);
                    $msg['color'] = $this->sanitizeString($msg['color']);
                    return $msg;
                }
                break;
            case 'stroke_points':
                if (isset($msg['id'], $msg['points']) && is_string($msg['id']) && is_array($msg['points'])) {
                    if (count($msg['points']) <= 1000) {
                        $msg['id'] = $this->sanitizeString($msg['id']);
                        $validPoints = [];
                        foreach ($msg['points'] as $p) {
                            if (isset($p['x'], $p['y']) && is_numeric($p['x']) && is_numeric($p['y'])) {
                                $validPoints[] = $p;
                            }
                        }
                        $msg['points'] = $validPoints;
                        return $msg;
                    }
                }
                break;
            case 'stroke_end':
                if (isset($msg['id']) && is_string($msg['id'])) {
                    $msg['id'] = $this->sanitizeString($msg['id']);
                    return $msg;
                }
                break;
            case 'command':
                if (isset($msg['action']) && in_array($msg['action'], ['clear', 'undo', 'redo'])) {
                    return $msg;
                }
                break;
            case 'erase_stroke':
                if (isset($msg['stroke_id']) && is_string($msg['stroke_id'])) {
                    $msg['stroke_id'] = $this->sanitizeString($msg['stroke_id']);
                    return $msg;
                }
                break;
            default:
                return null;
        }
        return null;
    }

    public function sanitizeString(string $s): string {
        $s = str_replace("\0", '', $s);
        return substr($s, 0, 255);
    }
}
