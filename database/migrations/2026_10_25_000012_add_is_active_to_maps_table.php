<?php

use App\Models\Map;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('maps', function (Blueprint $table) {
            $table->boolean('is_active')->default(false)->after('name')->index();
        });

        // Set the most recently updated or created map as default active
        $firstMap = Map::latest()->first();
        if ($firstMap) {
            $firstMap->update(['is_active' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maps', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
